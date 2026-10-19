// pages/api/worklogs/token.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireUser } from "@/lib/server/apiGuards";
import { generateShortcutToken, hashShortcutToken } from "@/lib/server/shortcutTokens";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Metoda niedozwolona." });
  }

  const session = await requireUser(req, res);
  if (!session) return;
  const { user } = session;

  const admin = supabaseAdmin();

  if (req.method === "DELETE") {
    const { error } = await admin.from("shortcut_tokens").delete().eq("user_id", user.id);
    if (error) {
      console.error("[worklogs/token] delete:", error.message);
      return res.status(500).json({ error: "Nie udało się unieważnić tokenu." });
    }
    return res.status(200).json({ revoked: true });
  }

  const token = generateShortcutToken();
  const { error } = await admin.from("shortcut_tokens").upsert(
    {
      user_id: user.id,
      token_hash: hashShortcutToken(token),
      created_at: new Date().toISOString(),
      last_used_at: null,
    },
    { onConflict: "user_id" }
  );
  if (error) {
    console.error("[worklogs/token] upsert:", error.message);
    return res.status(500).json({ error: "Nie udało się wygenerować tokenu." });
  }

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ token });
}
