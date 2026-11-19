// pages/api/letters/scan.ts
//
// Powiadomienia ePUAP / e-Doręczeń w wybranej skrzynce (Gmail, Outlook): tylko nagłówki, nic nie jest zapisywane.
// Wynik to propozycje wpisów w module Pisma – wpis powstaje dopiero po zatwierdzeniu formularza.

import type { NextApiRequest, NextApiResponse } from "next";
import { CACHE_CONTROL } from "@/config/server";
import { allowMethods } from "@/lib/server/apiGuards";
import { enforceRateLimit } from "@/lib/server/rateLimit";
import { loadMailContext } from "@/lib/server/mailRoute";
import { LETTER_NOTICE_QUERIES, toLetterNotices } from "@/lib/mail/letterNotices";

const PER_QUERY = 15;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET"])) return;
  res.setHeader("Cache-Control", CACHE_CONTROL.private);
  const ctx = await loadMailContext(req, res, req.query.accountId);
  if (!ctx) return;
  if (!(await enforceRateLimit(res, "letterScan", ctx.userId))) return;

  try {
    const batches = await Promise.all(LETTER_NOTICE_QUERIES.map((q) => ctx.client.listRecent(PER_QUERY, q)));
    const notices = toLetterNotices(
      ctx.accountId,
      batches.flat().map((m) => ({ id: m.id, threadId: m.threadId, subject: m.subject, from: m.from, date: m.date }))
    );
    return res.status(200).json({ notices });
  } catch (err) {
    console.error("[letters/scan]", err instanceof Error ? err.message : "nieznany błąd");
    return res.status(502).json({ error: "Nie udało się przeszukać skrzynki." });
  }
}
