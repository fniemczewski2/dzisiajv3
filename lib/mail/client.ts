// lib/mail/client.ts
//
// Klient API poczty po stronie przeglądarki. Błędy HTTP są zamieniane na MailApiError z komunikatem serwera.

import type { Invitation } from "@/lib/mail/invitations";

export interface MailAccount {
  id: string;
  provider: "gmail" | "outlook";
  email: string;
  createdAt: string;
  canDeleteInMailbox: boolean;
}

export interface MailMessageSummary {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string | null;
}

export interface MailAttachmentMeta {
  attachmentId: string;
  filename: string;
  mimeType: string;
}

export interface MailMessageFull extends MailMessageSummary {
  to: string;
  text: string;
  html: string | null;
  /** Obrazy osadzone: Content-ID → adres data:. */
  inlineImages: Record<string, string>;
  attachments: MailAttachmentMeta[];
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class MailApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "MailApiError";
  }
}

async function request<T>(fetchImpl: FetchLike, url: string, init?: RequestInit): Promise<T> {
  const res = await fetchImpl(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new MailApiError(res.status, body?.error ?? "Błąd serwera.");
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export interface InboxItem {
  id: string;
  from: string;
  subject: string;
  text: string;
  html: string | null;
  receivedAt: string;
  expiresAt: string;
  invitation: Invitation | null;
}

export interface ForwardingAddress {
  id: string;
  label: string;
  created_at: string;
  revoked_at: string | null;
}

export function createMailClient(fetchImpl: FetchLike = (url, init) => fetch(url, init)) {
  return {
    async listAccounts(): Promise<MailAccount[]> {
      const data = await request<{ accounts: MailAccount[] }>(fetchImpl, "/api/mail/accounts");
      return data.accounts;
    },

    /** Adres autoryzacji Google; przeglądarka przechodzi pod ten adres. */
    async startGmailConnection(): Promise<string> {
      const data = await request<{ url: string }>(fetchImpl, "/api/mail/gmail");
      return data.url;
    },

    /** Adres autoryzacji Microsoft (Outlook). */
    async startOutlookConnection(): Promise<string> {
      const data = await request<{ url: string }>(fetchImpl, "/api/mail/outlook");
      return data.url;
    },

    disconnect(accountId: string): Promise<void> {
      return request<void>(fetchImpl, `/api/mail/accounts?id=${encodeURIComponent(accountId)}`, { method: "DELETE" });
    },

    async listMessages(accountId: string, query = ""): Promise<MailMessageSummary[]> {
      const q = query.trim() ? `&q=${encodeURIComponent(query.trim())}` : "";
      const data = await request<{ messages: MailMessageSummary[] }>(
        fetchImpl,
        `/api/mail/messages?accountId=${encodeURIComponent(accountId)}${q}`
      );
      return data.messages;
    },

    async getMessage(
      accountId: string,
      id: string
    ): Promise<{ message: MailMessageFull; invitation: Invitation | null }> {
      return request(
        fetchImpl,
        `/api/mail/message?accountId=${encodeURIComponent(accountId)}&id=${encodeURIComponent(id)}`
      );
    },

    /** Wysyła odpowiedź. Flaga confirm jest ustawiana wyłącznie po jawnym zatwierdzeniu w interfejsie. */
    sendReply(params: { accountId: string; messageId: string; body: string }): Promise<{ sentId: string }> {
      return request(fetchImpl, "/api/mail/reply", json({ ...params, confirm: true }));
    },

    /** mailbox: true – także przeniesienie do kosza w skrzynce (wyłącznie po wyborze w potwierdzeniu). */
    deleteMessage(params: {
      accountId: string;
      messageId: string;
      mailbox: boolean;
    }): Promise<{ hidden: boolean; trashed: boolean }> {
      return request(fetchImpl, "/api/mail/delete", json(params));
    },

    async createTask(accountId: string, messageId: string): Promise<{ taskId: string }> {
      return request(fetchImpl, "/api/mail/task", json({ accountId, messageId }));
    },

    async createEvent(accountId: string, messageId: string): Promise<{ eventId: string }> {
      return request(fetchImpl, "/api/mail/event", json({ accountId, messageId }));
    },

    async listForwarding(): Promise<ForwardingAddress[]> {
      const data = await request<{ addresses: ForwardingAddress[] }>(fetchImpl, "/api/mail/forwarding");
      return data.addresses;
    },

    createForwarding(label: string): Promise<{ id: string; address: string; note: string }> {
      return request(fetchImpl, "/api/mail/forwarding", json({ label }));
    },

    revokeForwarding(id: string): Promise<void> {
      return request<void>(fetchImpl, `/api/mail/forwarding?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    async listInbox(): Promise<InboxItem[]> {
      const data = await request<{ messages: InboxItem[] }>(fetchImpl, "/api/mail/inbox");
      return data.messages;
    },

    deleteInbox(id: string): Promise<void> {
      return request<void>(fetchImpl, `/api/mail/inbox?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    inboxAction(id: string, action: "task" | "event"): Promise<{ taskId?: string; eventId?: string }> {
      return request(fetchImpl, "/api/mail/inbox/action", json({ id, action }));
    },
  };
}

export type MailClient = ReturnType<typeof createMailClient>;
