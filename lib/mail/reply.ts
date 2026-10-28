// lib/mail/reply.ts
//
// Budowa odpowiedzi w formacie RFC 5322 (MIME, UTF-8) i kodowanie dla Gmail API.
// Odpowiedź jest tylko przygotowywana; wysyła ją klient po zatwierdzeniu przez użytkownika.

const HEADER_UNSAFE = /[\r\n]/;

export interface ReplyInput {
  from: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string | null;
  references?: string | null;
}

function assertHeaderSafe(value: string): void {
  if (HEADER_UNSAFE.test(value)) throw new Error("Nieprawidłowy znak w nagłówku wiadomości.");
}

/** Kodowanie RFC 2047 dla nagłówków z polskimi znakami. */
export function encodeHeaderValue(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${utf8ToBase64(value)}?=`;
}

export function utf8ToBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** base64url (bez paddingu) – format wymagany przez Gmail API w polu `raw`. */
export function toBase64Url(value: string): string {
  return utf8ToBase64(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function buildReplyMime(input: ReplyInput): string {
  for (const v of [input.from, input.to, input.subject, input.inReplyTo ?? "", input.references ?? ""]) {
    assertHeaderSafe(v);
  }
  const subject = input.subject.trim();
  const replySubject = /^re:/i.test(subject) ? subject : `Re: ${subject}`;

  const headers = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${encodeHeaderValue(replySubject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  ];
  if (input.inReplyTo) headers.push(`In-Reply-To: ${input.inReplyTo}`);
  if (input.references || input.inReplyTo) {
    headers.push(`References: ${[input.references, input.inReplyTo].filter(Boolean).join(" ")}`);
  }

  const encodedBody = utf8ToBase64(input.body).replace(/(.{76})/g, "$1\r\n");
  return `${headers.join("\r\n")}\r\n\r\n${encodedBody}`;
}
