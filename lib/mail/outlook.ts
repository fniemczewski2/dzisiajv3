// lib/mail/outlook.ts
//
// Klient Microsoft Graph (poczta Outlook). Fetch jest wstrzykiwany; logika jest testowalna bez sieci.
// Zakresy Mail.ReadWrite i Mail.Send wymagają nowej zgody użytkownika (i zgody administratora w kontach służbowych).

import type { MailAttachment, MailInlineImage, MailMessage } from "@/lib/mail/types";
import { htmlToPlainText } from "@/lib/mail/htmlText";
import { outlookSearchParam } from "@/lib/mail/search";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
/** Mail.ReadWrite: odczyt i przeniesienie do „Elementów usuniętych”; Mail.Send: odpowiedzi. */
export const OUTLOOK_MAIL_SCOPES = ["offline_access", "User.Read", "Mail.ReadWrite", "Mail.Send"] as const;

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export class GraphApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "GraphApiError";
  }
}

interface GraphAddress {
  emailAddress?: { name?: string; address?: string };
}

interface GraphMessage {
  id: string;
  conversationId?: string;
  subject?: string;
  from?: GraphAddress;
  toRecipients?: GraphAddress[];
  receivedDateTime?: string;
  internetMessageId?: string;
  hasAttachments?: boolean;
  body?: { contentType?: string; content?: string };
}

interface GraphAttachment {
  id: string;
  name?: string;
  contentType?: string;
  contentBytes?: string;
  isInline?: boolean;
  contentId?: string;
  "@odata.type"?: string;
}

/** „Imię <adres>” z adresu Graph; brak nazwy daje sam adres. */
export function formatGraphAddress(value: GraphAddress | undefined): string {
  const address = value?.emailAddress?.address ?? "";
  const name = value?.emailAddress?.name?.trim() ?? "";
  return name && address ? `${name} <${address}>` : address;
}

export function decodeBase64Utf8(data: string): string {
  const binary = atob(data);
  return new TextDecoder("utf-8").decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

const SUMMARY_SELECT = "id,conversationId,subject,from,toRecipients,receivedDateTime,internetMessageId,hasAttachments";

function toMailMessage(
  m: GraphMessage,
  body: { text: string; html: string | null },
  files: { attachments: MailAttachment[]; inline: MailInlineImage[] }
): MailMessage {
  return {
    id: m.id,
    threadId: m.conversationId ?? m.id,
    subject: m.subject ?? "",
    from: formatGraphAddress(m.from),
    to: (m.toRecipients ?? []).map(formatGraphAddress).join(", "),
    date: m.receivedDateTime ?? null,
    messageId: m.internetMessageId ?? null,
    references: null,
    text: body.text,
    html: body.html,
    attachments: files.attachments,
    inlineImages: files.inline,
  };
}

const EMPTY_FILES = { attachments: [], inline: [] };

export function createOutlookClient(accessToken: string, fetchImpl: FetchLike = fetch) {
  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetchImpl(`${GRAPH_BASE}${path}`, {
      ...init,
      headers: { ...(init?.headers as Record<string, string> | undefined), Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new GraphApiError(res.status, `Microsoft Graph zwróciło błąd ${res.status}.`);
    if (res.status === 202 || res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  async function filesOf(messageId: string): Promise<{ attachments: MailAttachment[]; inline: MailInlineImage[] }> {
    const data = await call<{ value: GraphAttachment[] }>(
      `/me/messages/${encodeURIComponent(messageId)}/attachments?$select=id,name,contentType,isInline,contentId`
    );
    const attachments: MailAttachment[] = [];
    const inline: MailInlineImage[] = [];
    for (const a of data.value) {
      if (!(a["@odata.type"] ?? "").endsWith("fileAttachment")) continue;
      const mimeType = (a.contentType ?? "application/octet-stream").toLowerCase();
      const contentId = (a.contentId ?? "").replace(/^<|>$/g, "").trim();
      if (a.isInline && contentId && mimeType.startsWith("image/")) {
        inline.push({ contentId, attachmentId: a.id, mimeType });
      } else {
        attachments.push({ attachmentId: a.id, filename: a.name ?? "", mimeType });
      }
    }
    return { attachments, inline };
  }

  async function attachment(messageId: string, attachmentId: string): Promise<GraphAttachment> {
    return call<GraphAttachment>(
      `/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`
    );
  }

  return {
    async listRecent(limit: number, query?: string | null): Promise<MailMessage[]> {
      // Graph nie pozwala łączyć $search z $orderby – wyniki wyszukiwania są sortowane wg trafności.
      const path = query
        ? `/me/mailFolders/inbox/messages?$top=${limit}&$search=${encodeURIComponent(outlookSearchParam(query))}&$select=${SUMMARY_SELECT}`
        : `/me/mailFolders/inbox/messages?$top=${limit}&$orderby=receivedDateTime desc&$select=${SUMMARY_SELECT}`;
      const data = await call<{ value: GraphMessage[] }>(path);
      return data.value.map((m) => toMailMessage(m, { text: "", html: null }, EMPTY_FILES));
    },

    async getMessage(id: string): Promise<MailMessage> {
      const m = await call<GraphMessage>(`/me/messages/${encodeURIComponent(id)}?$select=${SUMMARY_SELECT},body`);
      const isHtml = (m.body?.contentType ?? "").toLowerCase() === "html";
      const content = m.body?.content ?? "";
      const files = m.hasAttachments ? await filesOf(m.id) : EMPTY_FILES;
      return toMailMessage(
        m,
        { text: isHtml ? htmlToPlainText(content) : content, html: isHtml ? content : null },
        files
      );
    },

    /** Treść załącznika (np. .ics) jako tekst. */
    async getAttachmentText(messageId: string, attachmentId: string): Promise<string> {
      return decodeBase64Utf8((await attachment(messageId, attachmentId)).contentBytes ?? "");
    },

    /** Treść załącznika jako base64 (obrazy osadzone). */
    async getAttachmentBase64(messageId: string, attachmentId: string): Promise<string> {
      return (await attachment(messageId, attachmentId)).contentBytes ?? "";
    },

    /** Przeniesienie do „Elementów usuniętych” (odwracalne). */
    async trashMessage(messageId: string): Promise<void> {
      await call<unknown>(`/me/messages/${encodeURIComponent(messageId)}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationId: "deleteditems" }),
      });
    },

    /** Odpowiedź w wątku. Wywoływać wyłącznie po zatwierdzeniu przez użytkownika. */
    async replyTo(messageId: string, comment: string): Promise<void> {
      await call<void>(`/me/messages/${encodeURIComponent(messageId)}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });
    },
  };
}
