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
// reply na przekierowaną wiadomość – nadawcą jest adres biletów b-<token>@…, adresatem skrzynka, która
// wiadomość przekazała (nadawca koperty SMTP). Działa tak samo dla automatycznego przekazywania w Gmailu
// i dla ręcznego „Przekaż dalej”: w obu przypadkach kopertę wystawia skrzynka przekazująca, a nagłówek
// From zostaje przewoźnika (przekazywanie automatyczne) albo zmienia się na użytkownika (ręczne).
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

    console.log(
      "inbound",
      JSON.stringify({
        to: message.to,
        tickets,
        parsed: (parsed.attachments ?? []).map((a) => ({ n: a.filename, m: a.mimeType })),
        sent: attachments.map((a) => ({ n: a.filename, m: a.mimeType, pdf: Boolean(a.pdfBase64) })),
      })
    );

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

    const { notice, summary } = await readNotice(res);
    // Diagnostyka bez danych wrażliwych: fragment adresu, liczba PDF i odpowiedź aplikacji.
    console.log(
      "inbound",
      JSON.stringify({
        token: message.to.slice(0, 6),
        pdfs: attachments.filter((a) => a.pdfBase64).length,
        status: res.status,
        summary: summary.slice(0, 1200),
      })
    );
    await reply(message, parsed, notice, env);
  },
};

/** Treść odpowiedzi z aplikacji (plus surowa odpowiedź do logu); przy błędzie HTTP – komunikat zastępczy. */
async function readNotice(res) {
  const summary = await res.text().catch(() => "");
  if (res.status !== 202) {
    return {
      summary,
      notice: {
        subject: "Bilet: nie udało się przetworzyć",
        body: `Aplikacja odrzuciła wiadomość (kod ${res.status}). Bilet nie został dodany – spróbuj ponownie później.`,
      },
    };
  }
  try {
    const data = JSON.parse(summary);
    return { summary, notice: data?.notice?.subject && data?.notice?.body ? data.notice : null };
  } catch {
    return { summary, notice: null };
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
 * Odpowiedź do skrzynki, która wiadomość przekazała, wysłana z adresu biletów.
 *
 * Adresat: nadawca koperty SMTP (`message.from`). Przy automatycznym przekazywaniu w Gmailu nagłówek From
 * zostaje przewoźnika (bilet@intercity.pl) – odpowiedź na ten adres trafiłaby do PKP Intercity, dlatego
 * bierzemy kopertę. Przy ręcznym „Przekaż dalej” oba adresy są tą samą skrzynką.
 *
 * Nadawca: adres biletów, na który wiadomość przyszła. Cloudflare dopuszcza taki From tylko wtedy, gdy jego
 * domena jest obsługiwana przez Email Routing na tym koncie – inaczej message.reply() zgłasza
 * „mail from is not from the correct domain”. Zob. docs/RUNBOOK.md, „Odpowiedzi na wiadomości z biletami”.
 */
async function reply(message, parsed, notice, env) {
  if (!notice) return;
  const to = message.from || parsed.from?.address;
  if (!to) return;
  const messageId = `<${crypto.randomUUID()}@${message.to.split("@")[1]}>`;
  const original = parsed.messageId ? headerSafe(parsed.messageId) : "";
  const raw =
    `From: ${headerSafe(message.to)}\r\n` +
    `To: ${headerSafe(to)}\r\n` +
    `Subject: ${encodeSubject(notice.subject)}\r\n` +
    `Message-ID: ${messageId}\r\n` +
    (original ? `In-Reply-To: ${original}\r\nReferences: ${original}\r\n` : "") +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: text/plain; charset="utf-8"\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n` +
    encodeBody(notice.body);

  try {
    await message.reply(new EmailMessage(message.to, to, raw));
    return;
  } catch (err) {
    console.error("reply:", err?.message ?? err);
  }
  // Zapasowo binding send_email (wrangler.toml → [[send_email]] name = "NOTIFY"), gdy reply nie przechodzi.
  if (!env.NOTIFY) return;
  try {
    await env.NOTIFY.send(new EmailMessage(message.to, to, raw));
  } catch (err) {
    console.error("send_email:", err?.message ?? err);
  }
}
