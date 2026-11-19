// pages/api/mail/inbound.ts
//
// Odbiór wiadomości przekierowanej z bramki poczty (wariant A). Dostęp chroniony sekretem nagłówka.
// Adres odbiorcy wskazuje konto; treść trafia do bufora szyfrowanego z czasem wygaśnięcia.
// Adres biletów (b-…): PDF z wiadomości → wpisy w „Pociągach” (lib/server/ticketInbound.ts), bez zapisu treści.
// Wiadomość bez rozpoznanego biletu (np. kod weryfikacyjny przekazywania w Gmailu) trafia do bufora Poczty
// („Przekierowane”, 72 h) – zwrot do nadawcy uniemożliwiłby włączenie automatycznego przekazywania. Bufor zamyka się
// po mailu weryfikacyjnym albo pierwszym rozpoznanym bilecie (buffer_closed_at); potem taka wiadomość → 422 (zwrot).

import { MAIL_INBOX_RETENTION_HOURS } from "@/config/limits";
import type { NextApiRequest, NextApiResponse } from "next";
import { serverEnv } from "@/config/env";
import { allowMethods } from "@/lib/server/apiGuards";
import { clientIp, enforceRateLimit } from "@/lib/server/rateLimit";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { isInboundAuthorized } from "@/lib/server/inboundAuth";
import { encryptToken } from "@/lib/server/tokenCrypto";
import { hashForwardingToken, isForwardingConfirmation, parseForwardingRecipient } from "@/lib/mail/forwarding";
import { parseInboundPayload, type InboundMessage } from "@/lib/mail/inbound";
import { importTicketMail } from "@/lib/server/ticketInbound";

/** Wiadomość z biletami w PDF (base64) jest większa niż domyślny limit 1 MB; Vercel przyjmuje do 4,5 MB. */
export const config = { api: { bodyParser: { sizeLimit: "4mb" } }, maxDuration: 30 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["POST"])) return;

  const provided = req.headers["x-mail-inbound-secret"];
  if (!isInboundAuthorized(serverEnv.mailInboundSecret, typeof provided === "string" ? provided : undefined)) {
    return res.status(401).json({ error: "Brak autoryzacji." });
  }

  if (!(await enforceRateLimit(res, "mailInbound", clientIp(req)))) return;

  const domain = serverEnv.mailForwardingDomain;
  if (!domain) return res.status(503).json({ error: "Przekierowania nie są skonfigurowane." });

  const message = parseInboundPayload(req.body);
  if (!message) return res.status(400).json({ error: "Nieprawidłowa wiadomość." });

  const target = parseForwardingRecipient(message.recipient, domain);
  if (!target) return res.status(404).json({ error: "Nieznany adres." });

  const admin = supabaseAdmin();
  const { data: address } = await admin
    .from("mail_forwarding_addresses")
    .select("id, user_id, buffer_closed_at")
    .eq("token_hash", await hashForwardingToken(target.token))
    .eq("kind", target.kind)
    .is("revoked_at", null)
    .maybeSingle();
  if (!address) return res.status(404).json({ error: "Nieznany adres." });

  if (target.kind === "tickets") {
    try {
      const result = await importTicketMail(admin, address.user_id, message);
      if (result.added > 0 || result.duplicates > 0) {
        // Bilet dotarł – przekazywanie działa, bufor nie jest już potrzebny.
        if (!address.buffer_closed_at) await closeTicketBuffer(admin, address.id);
        return res.status(202).json(result);
      }
    } catch (err) {
      console.error("[mail/inbound] bilety:", err instanceof Error ? err.message : "nieznany błąd");
      return res.status(500).json({ error: "Nie udało się zapisać biletu." });
    }
    if (address.buffer_closed_at) {
      return res.status(422).json({ error: "Nie rozpoznano biletu PKP Intercity w załącznikach PDF." });
    }
  }

  const stored = await bufferMessage(admin, address, message);
  if (!stored) return res.status(500).json({ error: "Nie udało się zapisać wiadomości." });
  if (target.kind !== "tickets") return res.status(202).end();

  const confirmation = isForwardingConfirmation(message);
  if (confirmation) await closeTicketBuffer(admin, address.id);
  return res.status(202).json({ added: 0, duplicates: 0, buffered: true, bufferClosed: confirmation });
}

/** Zamknięcie bufora adresu biletów (tylko pierwszy raz – kolejne wywołania nic nie zmieniają). */
async function closeTicketBuffer(admin: ReturnType<typeof supabaseAdmin>, addressId: string): Promise<void> {
  const { error } = await admin
    .from("mail_forwarding_addresses")
    .update({ buffer_closed_at: new Date().toISOString() })
    .eq("id", addressId)
    .is("buffer_closed_at", null);
  if (error) console.error("[mail/inbound] zamknięcie bufora:", error.message);
}

/** Bufor Poczty (szyfrowany, wygasa po MAIL_INBOX_RETENTION_HOURS); bez treści PDF. */
async function bufferMessage(
  admin: ReturnType<typeof supabaseAdmin>,
  address: { id: string; user_id: string },
  message: InboundMessage
): Promise<boolean> {
  const attachments = message.attachments.map(({ pdfBase64: _pdf, ...rest }) => rest);
  const payload = JSON.stringify({ ...message, attachments, receivedAt: new Date().toISOString() });
  const { error } = await admin.from("mail_inbox").insert({
    user_id: address.user_id,
    forwarding_id: address.id,
    payload_encrypted: encryptToken(payload),
    expires_at: new Date(Date.now() + MAIL_INBOX_RETENTION_HOURS * 3_600_000).toISOString(),
  });
  return !error;
}
