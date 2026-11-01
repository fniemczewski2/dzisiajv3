// lib/mail/gmail.ts
//
// Klient Gmail API (wariant B). Fetch jest wstrzykiwany, więc logikę można testować bez sieci.
// Zakresy OAuth (gmail.readonly, gmail.send) wymagają weryfikacji Google przed wdrożeniem.

import type { MailAttachment, MailInlineImage, MailMessage } from "@/lib/mail/types";
import { htmlToPlainText } from "@/lib/mail/htmlText";

const BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const BATCH_URL = "https://gmail.googleapis.com/batch/gmail/v1";
/** Limit części w jednym żądaniu zbiorczym Gmail API. */
const MAX_BATCH_PARTS = 100;
const SUMMARY_HEADERS = ["Subject", "From", "To", "Date", "Message-ID"];

/** Odpowiedź multipart/mixed z /batch: obiekty JSON części z kodem 200, w kolejności Content-ID. */
export function parseBatchResponse(body: string, boundary: string): Map<number, unknown> {
  const out = new Map<number, unknown>();
  for (const part of body.split(`--${boundary}`)) {
    const id = /Content-ID:\s*<?response-item(\d+)>?/i.exec(part);
    const http = /HTTP\/1\.1 (\d{3})[^\r\n]*\r?\n[\s\S]*?\r?\n\r?\n([\s\S]*)$/.exec(part);
    if (!id || !http || http[1] !== "200") continue;
    try {
      out.set(Number(id[1]), JSON.parse(http[2].trim()));
    } catch {
      // Uszkodzona część – wiadomość zostanie pobrana pojedynczo.
    }
  }
  return out;
}

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

    /**
     * Nagłówki wielu wiadomości jednym żądaniem zbiorczym (zamiast N osobnych). Części zakończone błędem
     * są pobierane pojedynczo, więc wynik ma tę samą kolejność i komplet wiadomości.
     */
    async getMessageSummaries(ids: readonly string[]): Promise<MailMessage[]> {
      if (ids.length === 0) return [];
      const query = `format=metadata${SUMMARY_HEADERS.map((h) => `&metadataHeaders=${encodeURIComponent(h)}`).join("")}`;
      const boundary = `batch_${crypto.randomUUID()}`;
      const slice = ids.slice(0, MAX_BATCH_PARTS);
      const body =
        slice
          .map(
            (id, i) =>
              `--${boundary}\r\nContent-Type: application/http\r\nContent-ID: <item${i}>\r\n\r\nGET /gmail/v1/users/me/messages/${encodeURIComponent(id)}?${query}\r\n\r\n`
          )
          .join("") + `--${boundary}--`;
      const res = await fetchImpl(BATCH_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/mixed; boundary=${boundary}` },
        body,
      });
      if (!res.ok) throw new GmailApiError(res.status, `Gmail API zwróciło błąd ${res.status}.`);
      const responseBoundary = /boundary=("?)([^";]+)\1/i.exec(res.headers.get("content-type") ?? "")?.[2];
      const parts = responseBoundary
        ? parseBatchResponse(await res.text(), responseBoundary)
        : new Map<number, unknown>();
      return Promise.all(
        slice.map((id, i) => {
          const raw = parts.get(i) as GmailRawMessage | undefined;
          return raw?.payload ? Promise.resolve(parseGmailMessage(raw)) : this.getMessageSummary(id);
        })
      );
    },

    /** Same nagłówki wiadomości (bez treści i załączników) – do listy. */
    async getMessageSummary(id: string): Promise<MailMessage> {
      const headers = SUMMARY_HEADERS.map((h) => `&metadataHeaders=${encodeURIComponent(h)}`).join("");
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
