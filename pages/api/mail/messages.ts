// pages/api/mail/messages.ts
//
// Lista ostatnich wiadomości z folderu odbiorczego (tylko nagłówki; treść pobierana osobno, na żądanie).

import type { NextApiRequest, NextApiResponse } from "next";
import { CACHE_CONTROL } from "@/config/server";
import { allowMethods } from "@/lib/server/apiGuards";
import { loadMailContext } from "@/lib/server/mailRoute";
import { normalizeSearchQuery } from "@/lib/mail/search";

const LIST_SIZE = 20;
/** Górny limit pobrania od dostawcy (lista + zapas na ukryte). */
const MAX_LIST_FETCH = 50;
const MAX_HIDDEN_LOOKUP = 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET"])) return;
  res.setHeader("Cache-Control", CACHE_CONTROL.private);
  const ctx = await loadMailContext(req, res, req.query.accountId);
  if (!ctx) return;

  try {
    // Wiadomości usunięte z aplikacji są pomijane; pobieramy zapas, żeby lista nie była krótsza niż LIST_SIZE.
    const { data: hiddenRows } = await ctx.supabase
      .from("mail_hidden_messages")
      .select("message_id")
      .eq("account_id", ctx.accountId)
      .limit(MAX_HIDDEN_LOOKUP);
    const hidden = new Set((hiddenRows ?? []).map((r) => r.message_id as string));
    const fetched = await ctx.client.listRecent(
      Math.min(MAX_LIST_FETCH, LIST_SIZE + hidden.size),
      normalizeSearchQuery(req.query.q)
    );
    const messages = fetched.filter((m) => !hidden.has(m.id)).slice(0, LIST_SIZE);
    return res.status(200).json({
      messages: messages.map((m) => ({
        id: m.id,
        threadId: m.threadId,
        subject: m.subject,
        from: m.from,
        date: m.date,
      })),
    });
  } catch (err) {
    console.error("[mail/messages] lista wiadomości:", err);
    return res.status(502).json({ error: "Nie udało się pobrać wiadomości." });
  }
}
