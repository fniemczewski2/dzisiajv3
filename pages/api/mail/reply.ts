// pages/api/mail/reply.ts
//
// Wysyła odpowiedź w wątku (Gmail lub Outlook). Wymaga jawnego potwierdzenia (confirm: true) z interfejsu;
// bez tej flagi nic nie jest wysyłane. Limit wysyłek: RATE_LIMITS.mailSend (na użytkownika).

import type { NextApiRequest, NextApiResponse } from "next";
import { CACHE_CONTROL } from "@/config/server";
import { allowMethods } from "@/lib/server/apiGuards";
import { enforceRateLimit } from "@/lib/server/rateLimit";
import { isValidMessageId, loadMailContext } from "@/lib/server/mailRoute";
import { ReplyAddressError } from "@/lib/mail/provider";

const MAX_REPLY_LENGTH = 10_000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["POST"])) return;
  res.setHeader("Cache-Control", CACHE_CONTROL.private);

  const input = (req.body ?? {}) as { accountId?: unknown; messageId?: unknown; body?: unknown; confirm?: unknown };
  if (input.confirm !== true) return res.status(400).json({ error: "Wysyłka wymaga potwierdzenia." });
  if (!isValidMessageId(input.messageId)) {
    return res.status(400).json({ error: "Nieprawidłowy identyfikator wiadomości." });
  }
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (body.length === 0 || body.length > MAX_REPLY_LENGTH) {
    return res.status(400).json({ error: `Treść odpowiedzi: od 1 do ${MAX_REPLY_LENGTH} znaków.` });
  }

  const ctx = await loadMailContext(req, res, input.accountId);
  if (!ctx) return;
  if (!(await enforceRateLimit(res, "mailSend", ctx.userId, "Za dużo wysłanych wiadomości. Spróbuj za kilka minut."))) {
    return;
  }

  try {
    const original = await ctx.client.getMessage(input.messageId);
    const sent = await ctx.client.reply(original, body);
    return res.status(200).json({ sentId: sent.id });
  } catch (err) {
    if (err instanceof ReplyAddressError) return res.status(422).json({ error: err.message });
    console.error("[mail/reply] wysyłka odpowiedzi:", err);
    return res.status(502).json({ error: "Nie udało się wysłać odpowiedzi." });
  }
}
