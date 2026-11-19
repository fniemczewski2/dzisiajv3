// lib/mail/inbound.ts
//
// Walidacja przychodzącej wiadomości przekierowanej do aplikacji (wariant A).
// Zwraca wyłącznie pola, których aplikacja używa; nagłówki techniczne i załączniki binarne odrzucane.

import { isSimpleEmail } from "@/lib/text";
import {
  MAX_INBOUND_HTML,
  MAX_INBOUND_ICS,
  MAX_INBOUND_PDF_BASE64,
  MAX_INBOUND_SUBJECT,
  MAX_INBOUND_TEXT,
} from "@/config/server";
import { detectInvitation, type Invitation } from "@/lib/mail/invitations";

export interface InboundAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  icsText?: string;
  /** Treść PDF (base64) – tylko dla adresu biletów, pomijana przy zapisie poczty do bufora. */
  pdfBase64?: string;
}

export interface InboundMessage {
  recipient: string;
  from: string;
  subject: string;
  text: string;
  html: string | null;
  attachments: InboundAttachment[];
}

function str(value: unknown, max: number): string | null {
  return typeof value === "string" && value.length <= max ? value : null;
}

/** Pole opcjonalne: brak = wartość domyślna; obecne, ale za długie lub nie-tekstowe = undefined (odrzucenie). */
function optionalText(value: unknown, max: number, fallback: string | null): string | null | undefined {
  if (value === undefined || value === null || value === "") return fallback;
  return str(value, max) ?? undefined;
}

function parseAttachment(item: unknown, index: number): InboundAttachment | null {
  if (!item || typeof item !== "object") return null;
  const a = item as Record<string, unknown>;
  const filename = str(a.filename, 255) ?? "";
  const mimeType = (str(a.mimeType, 127) ?? "application/octet-stream").toLowerCase();
  const isCalendar = mimeType === "text/calendar" || filename.toLowerCase().endsWith(".ics");
  const icsText = isCalendar ? str(a.icsText, MAX_INBOUND_ICS) : null;
  const isPdf = mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
  const pdf = isPdf ? str(a.pdfBase64, MAX_INBOUND_PDF_BASE64) : null;
  const pdfBase64 = pdf && /^[A-Za-z0-9+/]+={0,2}$/.test(pdf) ? pdf : null;
  return {
    attachmentId: `inbound-${index}`,
    filename,
    mimeType,
    ...(icsText ? { icsText } : {}),
    ...(pdfBase64 ? { pdfBase64 } : {}),
  };
}

export function parseInboundPayload(body: unknown): InboundMessage | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const recipient = str(b.recipient, 320)?.trim().toLowerCase() ?? null;
  const from = str(b.from, 320)?.trim() ?? null;
  const subject = optionalText(b.subject, MAX_INBOUND_SUBJECT, "");
  const text = optionalText(b.text, MAX_INBOUND_TEXT, "");
  const html = optionalText(b.html, MAX_INBOUND_HTML, null);
  if (subject === undefined || text === undefined || html === undefined) return null;
  if (!recipient || !isSimpleEmail(recipient, ",;<>") || !from) return null;

  // Maile przewoźników mają kilkanaście obrazków przed PDF: najpierw załączniki z treścią (.ics, PDF), potem reszta.
  const raw = Array.isArray(b.attachments) ? b.attachments.slice(0, 20) : [];
  const parsed = raw.map((item, i) => parseAttachment(item, i)).filter((a): a is InboundAttachment => a !== null);
  const hasContent = (a: InboundAttachment) => Boolean(a.icsText || a.pdfBase64);
  const kept = new Set([...parsed.filter(hasContent), ...parsed.filter((a) => !hasContent(a))].slice(0, 10));
  const attachments = parsed.filter((a) => kept.has(a)).map((a, i) => ({ ...a, attachmentId: `inbound-${i}` }));
  return { recipient, from, subject: subject ?? "", text: text ?? "", html, attachments };
}

export function invitationOf(message: InboundMessage): Invitation | null {
  return detectInvitation({ subject: message.subject, text: message.text, attachments: message.attachments });
}
