// lib/mail/inbound.ts
//
// Walidacja przychodzącej wiadomości przekierowanej do aplikacji (wariant A).
// Zwraca wyłącznie pola, których aplikacja używa; nagłówki techniczne i załączniki binarne odrzucane.

import { detectInvitation, type Invitation } from "@/lib/mail/invitations";

export const MAX_INBOUND_TEXT = 100_000;
const MAX_INBOUND_HTML = 300_000;
const MAX_INBOUND_SUBJECT = 998;
const MAX_INBOUND_ICS = 200_000;

export interface InboundAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  icsText?: string;
}

export interface InboundMessage {
  recipient: string;
  from: string;
  subject: string;
  text: string;
  html: string | null;
  attachments: InboundAttachment[];
}

const ADDRESS_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

function str(value: unknown, max: number): string | null {
  return typeof value === "string" && value.length <= max ? value : null;
}

export function parseInboundPayload(body: unknown): InboundMessage | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  const recipient = str(b.recipient, 320)?.trim().toLowerCase() ?? null;
  const from = str(b.from, 320)?.trim() ?? null;
  // Brak pola = pusty tekst; pole obecne, ale za długie albo nie-tekstowe = odrzucenie całej wiadomości.
  const subject = b.subject === undefined || b.subject === null ? "" : str(b.subject, MAX_INBOUND_SUBJECT);
  const text = b.text === undefined || b.text === null ? "" : str(b.text, MAX_INBOUND_TEXT);
  if (subject === null || text === null) return null;
  const html = b.html === undefined || b.html === null || b.html === "" ? null : str(b.html, MAX_INBOUND_HTML);
  if (b.html && html === null) return null;
  if (!recipient || !ADDRESS_RE.test(recipient) || !from) return null;

  const rawAttachments = Array.isArray(b.attachments) ? b.attachments.slice(0, 10) : [];
  const attachments: InboundAttachment[] = [];
  for (const item of rawAttachments) {
    if (!item || typeof item !== "object") continue;
    const a = item as Record<string, unknown>;
    const filename = str(a.filename, 255) ?? "";
    const mimeType = (str(a.mimeType, 127) ?? "application/octet-stream").toLowerCase();
    const icsText =
      mimeType === "text/calendar" || filename.toLowerCase().endsWith(".ics") ? str(a.icsText, MAX_INBOUND_ICS) : null;
    attachments.push({
      attachmentId: `inbound-${attachments.length}`,
      filename,
      mimeType,
      ...(icsText ? { icsText } : {}),
    });
  }

  return { recipient, from, subject, text, html, attachments };
}

export function invitationOf(message: InboundMessage): Invitation | null {
  return detectInvitation({ subject: message.subject, text: message.text, attachments: message.attachments });
}
