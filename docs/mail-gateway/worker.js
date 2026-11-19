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
// Bramka nie zapisuje treści: przekazuje ją jednym żądaniem do aplikacji i odrzuca wiadomość,
// jeśli aplikacja nie potwierdzi odbioru (kod 202) – nadawca dostaje wtedy zwrot.

import PostalMime from "postal-mime";

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

    if (res.status !== 202) message.setReject(`Odrzucono przez aplikację (${res.status}).`);
  },
};
