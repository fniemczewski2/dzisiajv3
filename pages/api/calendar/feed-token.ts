// pages/api/calendar/feed-token.ts
//
// Token kanału kalendarza: POST – nowy token (poprzedni przestaje działać), DELETE – wyłączenie kanału.
// Jawny token zwracany jest tylko raz; w bazie skrót.

import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, requireUser } from "@/lib/server/apiGuards";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { generateFeedToken, hashFeedToken } from "@/lib/server/calendarFeedTokens";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["POST", "DELETE"])) return;
  const session = await requireUser(req, res);
  if (!session) return;
  const admin = supabaseAdmin();
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "DELETE") {
    const { error } = await admin.from("calendar_feed_tokens").delete().eq("user_id", session.user.id);
    if (error) {
      console.error("[calendar/feed-token] delete:", error.message);
      return res.status(500).json({ error: "Nie udało się wyłączyć kanału." });
    }
    return res.status(200).json({ revoked: true });
  }

  const token = generateFeedToken();
  const { error } = await admin.from("calendar_feed_tokens").upsert(
    {
      user_id: session.user.id,
      token_hash: hashFeedToken(token),
      created_at: new Date().toISOString(),
      last_used_at: null,
    },
    { onConflict: "user_id" }
  );
  if (error) {
    console.error("[calendar/feed-token] upsert:", error.message);
    return res.status(500).json({ error: "Nie udało się utworzyć adresu kanału." });
  }
  return res.status(200).json({ token });
}
