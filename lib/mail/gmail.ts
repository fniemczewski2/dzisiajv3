// lib/mail/gmail.ts
//
// Klient Gmail API (wariant B). Fetch jest wstrzykiwany, więc logikę można testować bez sieci.
// Zakresy OAuth (gmail.readonly, gmail.send) wymagają weryfikacji Google przed wdrożeniem.

import type { MailAttachment, MailInlineImage, MailMessage } from "@/lib/mail/types";
import { htmlToPlainText } from "@/lib/mail/htmlText";

const BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export class GmailApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "GmailApiError";
  }
}

interface GmailPart {
  mimeType?: string;
  filename?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: GmailPart[];
}

export interface GmailRawMessage {
  id: string;
  threadId: string;
  payload: GmailPart;
}

export function decodeBase64Url(data: string): string {
  const base64 = data
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(data.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

/** base64url → standardowe base64 (do adresów data:). */
function base64UrlToBase64(data: string): string {
  return data
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(data.length / 4) * 4, "=");
}

function header(headers: GmailPart["headers"], name: string): string {
  const lower = name.toLowerCase();
  return headers?.find((h) => h.name.toLowerCase() === lower)?.value ?? "";
}

interface Collected {
  text: string[];
  html: string[];
  attachments: MailAttachment[];
  inline: MailInlineImage[];
}

/** Zbiera treść text/plain i text/html, załączniki i obrazy osadzone (Content-ID). */
function walk(part: GmailPart, out: Collected): void {
  const mimeType = (part.mimeType ?? "application/octet-stream").toLowerCase();
  const contentId = header(part.headers, "Content-ID").replace(/^<|>$/g, "").trim();
  if (part.body?.attachmentId && contentId && mimeType.startsWith("image/")) {
    out.inline.push({ contentId, attachmentId: part.body.attachmentId, mimeType });
  } else if (part.filename && part.body?.attachmentId) {
    out.attachments.push({ attachmentId: part.body.attachmentId, filename: part.filename, mimeType });
  } else if (mimeType === "text/plain" && part.body?.data) {
    out.text.push(decodeBase64Url(part.body.data));
  } else if (mimeType === "text/html" && part.body?.data) {
    out.html.push(decodeBase64Url(part.body.data));
  }
  for (const child of part.parts ?? []) walk(child, out);
}

export function parseGmailMessage(raw: GmailRawMessage): MailMessage {
  const headers = raw.payload.headers;
  const collected: Collected = { text: [], html: [], attachments: [], inline: [] };
  walk(raw.payload, collected);
  const html = collected.html.length > 0 ? collected.html.join("\n") : null;
  return {
    id: raw.id,
    threadId: raw.threadId,
    subject: header(headers, "Subject"),
    from: header(headers, "From"),
    to: header(headers, "To"),
    date: header(headers, "Date") || null,
    messageId: header(headers, "Message-ID") || null,
    references: header(headers, "References") || null,
    text: collected.text.length > 0 ? collected.text.join("\n") : html ? htmlToPlainText(html) : "",
    html,
    attachments: collected.attachments,
    inlineImages: collected.inline,
  };
}

export function createGmailClient(accessToken: string, fetchImpl: FetchLike = fetch) {
  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    // Nagłówki przekazujemy zawsze jako obiekt (nie tablicę), więc rzutowanie jest bezpieczne.
    const extra = init?.headers as Record<string, string> | undefined;
    const res = await fetchImpl(`${BASE}${path}`, {
      ...init,
      headers: { ...extra, Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new GmailApiError(res.status, `Gmail API zwróciło błąd ${res.status}.`);
    return (await res.json()) as T;
  }

  async function attachmentData(messageId: string, attachmentId: string): Promise<string> {
    const data = await call<{ data: string }>(
      `/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`
    );
    return data.data;
  }

  return {
    async listMessageIds(maxResults = 20, query?: string): Promise<string[]> {
      const q = query ? `&q=${encodeURIComponent(query)}` : "";
      const data = await call<{ messages?: { id: string }[] }>(`/messages?maxResults=${maxResults}${q}`);
      return (data.messages ?? []).map((m) => m.id);
    },

    /** Same nagłówki wiadomości (bez treści i załączników) – do listy. */
    async getMessageSummary(id: string): Promise<MailMessage> {
      const headers = ["Subject", "From", "To", "Date", "Message-ID"]
        .map((h) => `&metadataHeaders=${encodeURIComponent(h)}`)
        .join("");
      const raw = await call<GmailRawMessage>(`/messages/${encodeURIComponent(id)}?format=metadata${headers}`);
      return parseGmailMessage(raw);
    },

    async getMessage(id: string): Promise<MailMessage> {
      const raw = await call<GmailRawMessage>(`/messages/${encodeURIComponent(id)}?format=full`);
      return parseGmailMessage(raw);
    },

    /** Treść załącznika (np. .ics) jako tekst. */
    async getAttachmentText(messageId: string, attachmentId: string): Promise<string> {
      return decodeBase64Url(await attachmentData(messageId, attachmentId));
    },

    /** Treść załącznika jako standardowe base64 (obrazy osadzone). */
    async getAttachmentBase64(messageId: string, attachmentId: string): Promise<string> {
      return base64UrlToBase64(await attachmentData(messageId, attachmentId));
    },

    /** Przeniesienie do kosza (odwracalne przez 30 dni); wymaga zakresu gmail.modify. */
    async trashMessage(id: string): Promise<void> {
      await call<unknown>(`/messages/${encodeURIComponent(id)}/trash`, { method: "POST" });
    },

    /** Wysyła odpowiedź; wywoływać wyłącznie po zatwierdzeniu przez użytkownika. */
    async sendReply(params: { raw: string; threadId: string }): Promise<{ id: string }> {
      return call<{ id: string }>("/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
    },
  };
}
