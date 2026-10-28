// docs/mail-gateway/worker.js
//
// Bramka poczty dla przekierowań (Cloudflare Email Routing → Email Worker → /api/mail/inbound).
// NIE jest częścią bundla aplikacji. Wdrożenie i konfiguracja: docs/RUNBOOK.md, sekcja „Przekierowania poczty”.
//   INBOUND_URL          – zmienna w wrangler.toml (https://<domena>/api/mail/inbound)
//   MAIL_INBOUND_SECRET  – sekret Workera (`npx wrangler secret put MAIL_INBOUND_SECRET`), ta sama wartość co w Vercelu
//
// Bramka nie zapisuje treści: przekazuje ją jednym żądaniem do aplikacji i odrzuca wiadomość,
// jeśli aplikacja nie potwierdzi odbioru (kod 202) – nadawca dostaje wtedy zwrot.

import PostalMime from "postal-mime";

/** Nadawca z nagłówka From (nie z koperty SMTP – przy przekierowaniu koperta wskazuje skrzynkę przekierowującą). */
function headerFrom(parsed, envelopeFrom) {
  const from = parsed.from;
  if (!from?.address) return envelopeFrom;
  return from.name ? `${from.name} <${from.address}>` : from.address;
}

export default {
  async email(message, env) {
    const parsed = await PostalMime.parse(message.raw);
    const attachments = (parsed.attachments ?? []).slice(0, 10).map((a) => {
      const mimeType = (a.mimeType ?? "application/octet-stream").toLowerCase();
      const isCalendar = mimeType === "text/calendar" || (a.filename ?? "").toLowerCase().endsWith(".ics");
      return {
        filename: a.filename ?? "",
        mimeType,
        ...(isCalendar ? { icsText: new TextDecoder().decode(a.content) } : {}),
      };
    });

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
