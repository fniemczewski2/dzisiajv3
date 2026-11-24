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

/** Bajty → base64. Wartości są zawsze z zakresu 0–255, więc fromCodePoint daje ten sam wynik co fromCharCode. */
function toBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCodePoint(...bytes.subarray(i, i + chunk));
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
  for (const b of bytes) binary += String.fromCodePoint(b);
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

/** Treść odpowiedzi jako base64 – kodowanie quoted-printable nie jest tu potrzebne. */
function encodeBody(body) {
  const bytes = new TextEncoder().encode(body);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCodePoint(...bytes.subarray(i, i + chunk));
  return btoa(binary).replaceAll(/(.{76})/g, "$1\r\n");
}

/** Domena nadrzędna adresu: b-…@poczta.dzisiaj.fun → dzisiaj.fun (zapasowy nadawca odpowiedzi). */
function parentDomain(address) {
  const domain = String(address).split("@")[1] ?? "";
  const labels = domain.split(".");
  return labels.length > 2 ? labels.slice(1).join(".") : domain;
}

/**
 * Kandydaci na nadawcę odpowiedzi, w kolejności prób. Cloudflare dopuszcza w polu From wyłącznie adres
 * z domeny obsługiwanej przez Email Routing na tym koncie; inaczej message.reply() zgłasza
 * „mail from is not from the correct domain”. Próbujemy po kolei, bo konfiguracje domen bywają różne:
 *   1. REPLY_FROM – jawnie ustawiony adres (wrangler.toml → [vars]), ma pierwszeństwo,
 *   2. adres biletów, na który wiadomość przyszła (naturalny nadawca odpowiedzi),
 *   3. no-reply@<domena nadrzędna> – gdy Email Routing obsługuje tylko domenę główną, nie subdomenę.
 */
function replySenders(message, env) {
  const candidates = [env.REPLY_FROM, message.to, `no-reply@${parentDomain(message.to)}`];
  return [...new Set(candidates.filter(Boolean))];
}

/** Wartość nagłówka z przetworzonej wiadomości (postal-mime zwraca listę par klucz–wartość). */
function headerValue(parsed, name) {
  const needle = name.toLowerCase();
  const found = (parsed.headers ?? []).find((h) => String(h.key ?? "").toLowerCase() === needle);
  return found?.value ?? "";
}

/**
 * Łańcuch References odpowiedzi: cały łańcuch oryginału plus jego Message-ID, w tej kolejności.
 * Cloudflare sprawdza tę wartość co do znaku i odrzuca odpowiedź komunikatem
 * „provided References header is invalid; expected …”.
 */
function referencesChain(parsed) {
  const previous = String(headerValue(parsed, "references") || "")
    .split(/\s+/)
    .filter((id) => id.startsWith("<"));
  const own = parsed.messageId ? [headerSafe(parsed.messageId)] : [];
  return [...new Set([...previous, ...own])].join(" ");
}

/** Wiadomość RFC 822 z odpowiedzią (treść tekstowa, UTF-8). */
function buildReply(from, to, parsed, notice, domain) {
  const inReplyTo = parsed.messageId ? headerSafe(parsed.messageId) : "";
  const references = referencesChain(parsed);
  return (
    `From: ${headerSafe(from)}\r\n` +
    `To: ${headerSafe(to)}\r\n` +
    `Subject: ${encodeSubject(notice.subject)}\r\n` +
    `Message-ID: <${crypto.randomUUID()}@${domain}>\r\n` +
    (inReplyTo ? `In-Reply-To: ${inReplyTo}\r\n` : "") +
    (references ? `References: ${references}\r\n` : "") +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: text/plain; charset="utf-8"\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n` +
    encodeBody(notice.body)
  );
}

/**
 * Odpowiedź z wynikiem do skrzynki, która wiadomość przekazała. Każdy użytkownik, niezależnie od adresu,
 * ma dostać zwrotkę. Cloudflare dopuszcza jedną odpowiedź na wiadomość, więc message.reply() wykonujemy raz,
 * pierwszym nadawcą z listy; binding send_email (jeśli włączony) jest zapasem dla zweryfikowanych adresów.
 *
 * Adresat: nadawca koperty SMTP (`message.from`). Przy automatycznym przekazywaniu w Gmailu nagłówek From
 * zostaje przewoźnika (bilet@intercity.pl) – odpowiedź na ten adres trafiłaby do PKP Intercity, dlatego
 * bierzemy kopertę. Przy ręcznym „Przekaż dalej” oba adresy są tą samą skrzynką.
 */
async function reply(message, parsed, notice, env) {
  if (!notice) return;
  const to = message.from || parsed.from?.address;
  if (!to) {
    console.error("reply: brak adresu zwrotnego");
    return;
  }
  const domain = String(message.to).split("@")[1] ?? "localhost";
  const errors = [];
  const senders = replySenders(message, env);

  // Odpowiedzieć na wiadomość można tylko raz („mail has already been replied to”), więc reply()
  // próbujemy wyłącznie pierwszym nadawcą; pozostali kandydaci idą przez binding send_email.
  const [primary, ...rest] = senders;
  try {
    await message.reply(new EmailMessage(primary, to, buildReply(primary, to, parsed, notice, domain)));
    return;
  } catch (err) {
    errors.push(`${primary}: ${err?.message ?? err}`);
  }

  if (env.NOTIFY) {
    for (const from of [primary, ...rest]) {
      try {
        await env.NOTIFY.send(new EmailMessage(from, to, buildReply(from, to, parsed, notice, domain)));
        return;
      } catch (err) {
        errors.push(`send_email ${from}: ${err?.message ?? err}`);
      }
    }
  }
  // Brak odpowiedzi to utrata wyniku dla użytkownika – zostawiamy ślad w logach z powodami wszystkich prób.
  console.error("reply: nie udało się wysłać odpowiedzi", JSON.stringify(errors));
}
