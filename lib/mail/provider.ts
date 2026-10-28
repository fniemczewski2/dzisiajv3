// lib/mail/provider.ts
//
// Jednolity interfejs dla dostawców poczty (Gmail, Outlook). Trasy /api/mail/* nie znają szczegółów API.

import type { MailMessage } from "@/lib/mail/types";
import { buildReplyMime, toBase64Url } from "@/lib/mail/reply";
import { extractAddress } from "@/lib/mail/addresses";
import { gmailQuery } from "@/lib/mail/search";
import type { createGmailClient } from "@/lib/mail/gmail";
import type { createOutlookClient } from "@/lib/mail/outlook";

export interface MailProviderClient {
  listRecent(limit: number, query?: string | null): Promise<MailMessage[]>;
  getMessage(id: string): Promise<MailMessage>;
  getAttachmentText(messageId: string, attachmentId: string): Promise<string>;
  getAttachmentBase64(messageId: string, attachmentId: string): Promise<string>;
  /** Przeniesienie wiadomości do kosza w skrzynce (odwracalne). */
  trash(messageId: string): Promise<void>;
  /** Odpowiedź w wątku; wywoływać wyłącznie po zatwierdzeniu przez użytkownika. */
  reply(original: MailMessage, body: string): Promise<{ id: string | null }>;
}

export class ReplyAddressError extends Error {
  constructor() {
    super("Nie udało się ustalić adresu odbiorcy.");
    this.name = "ReplyAddressError";
  }
}

type GmailClient = ReturnType<typeof createGmailClient>;
type OutlookClient = ReturnType<typeof createOutlookClient>;

export function gmailProvider(client: GmailClient, accountEmail: string): MailProviderClient {
  return {
    async listRecent(limit, query) {
      const ids = await client.listMessageIds(limit, gmailQuery(query ?? null));
      return Promise.all(ids.map((id) => client.getMessageSummary(id)));
    },
    getMessage: (id) => client.getMessage(id),
    getAttachmentText: (messageId, attachmentId) => client.getAttachmentText(messageId, attachmentId),
    getAttachmentBase64: (messageId, attachmentId) => client.getAttachmentBase64(messageId, attachmentId),
    trash: (messageId) => client.trashMessage(messageId),
    async reply(original, body) {
      const to = extractAddress(original.from);
      if (!to) throw new ReplyAddressError();
      const mime = buildReplyMime({
        from: accountEmail,
        to,
        subject: original.subject,
        body,
        inReplyTo: original.messageId,
        references: original.references,
      });
      const sent = await client.sendReply({ raw: toBase64Url(mime), threadId: original.threadId });
      return { id: sent.id };
    },
  };
}

export function outlookProvider(client: OutlookClient): MailProviderClient {
  return {
    listRecent: (limit, query) => client.listRecent(limit, query),
    getMessage: (id) => client.getMessage(id),
    getAttachmentText: (messageId, attachmentId) => client.getAttachmentText(messageId, attachmentId),
    getAttachmentBase64: (messageId, attachmentId) => client.getAttachmentBase64(messageId, attachmentId),
    trash: (messageId) => client.trashMessage(messageId),
    async reply(original, body) {
      await client.replyTo(original.id, body);
      return { id: null };
    },
  };
}
