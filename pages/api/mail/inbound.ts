// pages/api/mail/inbound.ts
//
// Odbiór wiadomości przekierowanej z bramki poczty (wariant A). Dostęp chroniony sekretem nagłówka.
// Adres odbiorcy wskazuje konto; treść trafia do bufora szyfrowanego z czasem wygaśnięcia.

import type { NextApiRequest, NextApiResponse } from "next";
import { serverEnv } from "@/config/env";
import { allowMethods } from "@/lib/server/apiGuards";
import { clientIp, enforceRateLimit } from "@/lib/server/rateLimit";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { isInboundAuthorized } from "@/lib/server/inboundAuth";
import { encryptToken } from "@/lib/server/tokenCrypto";
import { hashForwardingToken, INBOX_RETENTION_HOURS, tokenFromRecipient } from "@/lib/mail/forwarding";
import { parseInboundPayload } from "@/lib/mail/inbound";

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

  const token = tokenFromRecipient(message.recipient, domain);
  if (!token) return res.status(404).json({ error: "Nieznany adres." });

  const admin = supabaseAdmin();
  const { data: address } = await admin
    .from("mail_forwarding_addresses")
    .select("id, user_id")
    .eq("token_hash", await hashForwardingToken(token))
    .is("revoked_at", null)
    .maybeSingle();
  if (!address) return res.status(404).json({ error: "Nieznany adres." });

  const payload = JSON.stringify({ ...message, receivedAt: new Date().toISOString() });
  const { error } = await admin.from("mail_inbox").insert({
    user_id: address.user_id,
    forwarding_id: address.id,
    payload_encrypted: encryptToken(payload),
    expires_at: new Date(Date.now() + INBOX_RETENTION_HOURS * 3_600_000).toISOString(),
  });
  if (error) return res.status(500).json({ error: "Nie udało się zapisać wiadomości." });
  return res.status(202).end();
}
