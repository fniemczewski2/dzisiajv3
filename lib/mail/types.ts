// lib/mail/types.ts
//
// Wspólne typy modułu poczty (Gmail, Outlook, przekierowanie). Treść wiadomości nie jest
// zapisywana w bazie: istnieje tylko w pamięci podczas wyświetlania.

export type MailProvider = "gmail" | "outlook" | "forwarded";

export interface MailAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
}

/** Obraz osadzony w treści HTML (src="cid:…"). */
export interface MailInlineImage {
  contentId: string;
  attachmentId: string;
  mimeType: string;
}

export interface MailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string | null;
  /** Nagłówek Message-ID (do poprawnego wiązania odpowiedzi w wątku). */
  messageId: string | null;
  references: string | null;
  text: string;
  /** Treść HTML (surowa, przed sanitizacją po stronie przeglądarki). */
  html: string | null;
  attachments: MailAttachment[];
  inlineImages: MailInlineImage[];
}
