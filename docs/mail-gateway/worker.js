// docs/mail-gateway/worker.js
//
// Bramka poczty dla przekierowań (Cloudflare Email Routing → Email Worker → /api/mail/inbound).
// NIE jest częścią bundla aplikacji. Wdrożenie i konfiguracja: docs/RUNBOOK.md, sekcja „Przekierowania poczty”.
//   INBOUND_URL          – zmienna w wrangler.toml (https://<domena>/api/mail/inbound)
//   MAIL_INBOUND_SECRET  – sekret Workera (`npx wrangler secret put MAIL_INBOUND_SECRET`), ta sama wartość co w Vercelu
//
//   MAX_PDF_BYTES        – opcjonalnie: limit jednego PDF z biletem (domyślnie 2 000 000 B; zob. RUNBOOK „Limity wiadomości”)
//
// PDF są przekazywane (base64) wyłącznie dla adresów biletów b-<token>@…; dla adresów poczty p-… – tylko nazwy plików.
// Bramka nie zapisuje treści: przekazuje ją jednym żądaniem do aplikacji.
//
// Odpowiedź o wyniku: aplikacja zwraca w JSON pole `notice` (temat + treść), a bramka wysyła je jako
// reply na przekierowaną wiadomość – nadawcą jest adres biletów b-<token>@…, adresatem autor przekierowania.
// Wiadomości nie odrzucamy nawet przy błędzie aplikacji: zwrot SMTP kończył się komunikatem od
// mailer-daemona i utratą biletu. Błąd aplikacji → reply z informacją o niepowodzeniu.

import PostalMime from "postal-mime";
import { EmailMessage } from "cloudflare:email";

/** Nadawca z nagłówka From (nie z koperty SMTP – przy przekierowaniu koperta wskazuje skrzynkę przekierowującą). */
function headerFrom(parsed, envelopeFrom) {
  const from = parsed.from;
  if (!from?.address) return envelopeFrom;
  return from.name ? `${from.name} <${from.address}>` : from.address;
}

/** Limity zgodne z config/server.ts (MAX_INBOUND_PDF_BASE64, MAX_INBOUND_PDF_TOTAL_BASE64, MAX_INBOUND_PDFS). */
const DEFAULT_MAX_PDF_BYTES = 2_000_000;
const MAX_TOTAL_PDF_BYTES = 2_900_000;
const MAX_PDFS = 5;

function toBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function isTicketAddress(recipient) {
  return /^b-[a-f0-9]{32}@/i.test(recipient ?? "");
}

export default {
  async email(message, env) {
    const parsed = await PostalMime.parse(message.raw);
    const tickets = isTicketAddress(message.to);
    const maxPdf = Number(env.MAX_PDF_BYTES) > 0 ? Number(env.MAX_PDF_BYTES) : DEFAULT_MAX_PDF_BYTES;
    let pdfCount = 0;
    let pdfTotal = 0;
    const mapped = (parsed.attachments ?? []).slice(0, 50).map((a) => {
      const mimeType = (a.mimeType ?? "application/octet-stream").toLowerCase();
      const filename = a.filename ?? "";
      const isCalendar = mimeType === "text/calendar" || filename.toLowerCase().endsWith(".ics");
      const isPdf = mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
      const bytes =
        a.content instanceof ArrayBuffer ? new Uint8Array(a.content) : new TextEncoder().encode(a.content ?? "");
      const sendPdf =
        tickets &&
        isPdf &&
        pdfCount < MAX_PDFS &&
        bytes.length <= maxPdf &&
        pdfTotal + bytes.length <= MAX_TOTAL_PDF_BYTES;
      if (sendPdf) {
        pdfCount++;
        pdfTotal += bytes.length;
      }
      return {
        filename,
        mimeType,
        ...(isCalendar ? { icsText: new TextDecoder().decode(a.content) } : {}),
        ...(sendPdf ? { pdfBase64: toBase64(bytes) } : {}),
      };
    });
    // Załączniki z treścią (.ics, PDF) przed obrazkami stopki – aplikacja przyjmuje do 20 pozycji.
    const attachments = [
      ...mapped.filter((a) => a.icsText || a.pdfBase64),
      ...mapped.filter((a) => !a.icsText && !a.pdfBase64),
    ].slice(0, 20);

    const res = await fetch(env.INBOUND_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-mail-inbound-secret": env.MAIL_INBOUND_SECRET },
      body: JSON.stringify({
        recipient: message.to,
        from: headerFrom(parsed, message.from),
        subject: parsed.subject ?? "",
        text: parsed.text ?? "",
        html: parsed.html ?? null,
        attachments,
      }),
    });

    const notice = await readNotice(res);
    await reply(message, parsed, notice);
  },
};

/** Treść odpowiedzi z aplikacji; przy błędzie HTTP – komunikat zastępczy. */
async function readNotice(res) {
  if (res.status !== 202) {
    return {
      subject: "Bilet: nie udało się przetworzyć",
      body: `Aplikacja odrzuciła wiadomość (kod ${res.status}). Bilet nie został dodany – spróbuj ponownie później.`,
    };
  }
  try {
    const data = await res.json();
    return data?.notice?.subject && data?.notice?.body ? data.notice : null;
  } catch {
    return null;
  }
}

/** Nagłówek adresu w MIME: ASCII bez znaków sterujących (bezpieczne złożenie wiersza nagłówka). */
function headerSafe(value) {
  return String(value ?? "").replaceAll(/[\r\n]/g, " ");
}

/** Tekst w nagłówku Subject: kodowanie MIME word (UTF-8, base64) – polskie znaki. */
function encodeSubject(subject) {
  const bytes = new TextEncoder().encode(subject);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

/** Treść odpowiedzi jako base64 – kodowanie quoted-printable nie jest tu potrzebne. */
function encodeBody(body) {
  const bytes = new TextEncoder().encode(body);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary).replaceAll(/(.{76})/g, "$1\r\n");
}

/**
 * Odpowiedź do nadawcy przekierowania, wysłana z adresu, na który bilet przyszedł.
 * message.reply() nie wymaga bindingu send_email – Cloudflare dopuszcza odpowiedź na odebraną wiadomość.
 */
async function reply(message, parsed, notice) {
  if (!notice) return;
  const to = parsed.from?.address || message.from;
  if (!to) return;
  const messageId = `<${crypto.randomUUID()}@${message.to.split("@")[1]}>`;
  const inReplyTo = parsed.messageId
    ? `In-Reply-To: ${headerSafe(parsed.messageId)}\r\nReferences: ${headerSafe(parsed.messageId)}\r\n`
    : "";
  const raw =
    `From: ${headerSafe(message.to)}\r\n` +
    `To: ${headerSafe(to)}\r\n` +
    `Subject: ${encodeSubject(notice.subject)}\r\n` +
    `Message-ID: ${messageId}\r\n` +
    inReplyTo +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: text/plain; charset="utf-8"\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n` +
    encodeBody(notice.body);
  try {
    await message.reply(new EmailMessage(message.to, to, raw));
  } catch (err) {
    console.error("reply:", err?.message ?? err);
  }
}
