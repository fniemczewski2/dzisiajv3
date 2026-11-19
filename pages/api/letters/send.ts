// pages/api/letters/send.ts
//
// Wysyłka pisma e-mailem z połączonej skrzynki (Gmail, Outlook). Wymaga jawnego potwierdzenia (confirm: true)
// z interfejsu – bez niego nic nie jest wysyłane. Limit: RATE_LIMITS.mailSend (wspólny z odpowiedziami).
// Konto musi mieć zgodę na wysyłkę (gmail.send / Mail.Send) – inaczej dostawca odrzuca żądanie (502).

import type { NextApiRequest, NextApiResponse } from "next";
import { MAX_MAIL_REPLY_LENGTH } from "@/config/limits";
import { CACHE_CONTROL } from "@/config/server";
import { allowMethods } from "@/lib/server/apiGuards";
import { enforceRateLimit } from "@/lib/server/rateLimit";
import { loadMailContext } from "@/lib/server/mailRoute";
import { isSimpleEmail } from "@/lib/text";

const SUBJECT_MAX = 200;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["POST"])) return;
  res.setHeader("Cache-Control", CACHE_CONTROL.private);

  const input = (req.body ?? {}) as Record<string, unknown>;
  if (input.confirm !== true) return res.status(400).json({ error: "Wysyłka wymaga potwierdzenia." });
  const to = typeof input.to === "string" ? input.to.trim() : "";
  if (!to || to.length > 320 || !isSimpleEmail(to, ",;<>")) {
    return res.status(400).json({ error: "Nieprawidłowy adres odbiorcy." });
  }
  const subject = typeof input.subject === "string" ? input.subject.replaceAll(/[\r\n]+/g, " ").trim() : "";
  if (!subject || subject.length > SUBJECT_MAX) {
    return res.status(400).json({ error: `Temat: od 1 do ${SUBJECT_MAX} znaków.` });
  }
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (!body || body.length > MAX_MAIL_REPLY_LENGTH) {
    return res.status(400).json({ error: `Treść: od 1 do ${MAX_MAIL_REPLY_LENGTH} znaków.` });
  }

  const ctx = await loadMailContext(req, res, input.accountId);
  if (!ctx) return;
  if (!(await enforceRateLimit(res, "mailSend", ctx.userId, "Za dużo wysłanych wiadomości. Spróbuj za kilka minut."))) {
    return;
  }
  try {
    const sent = await ctx.client.send({ to, subject, body });
    return res.status(200).json({ sentId: sent.id, from: ctx.accountEmail });
  } catch (err) {
    console.error("[letters/send]", err instanceof Error ? err.message : "nieznany błąd");
    return res.status(502).json({ error: "Nie udało się wysłać pisma. Sprawdź, czy konto ma zgodę na wysyłkę." });
  }
}
