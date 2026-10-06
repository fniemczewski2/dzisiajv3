// pages/api/worklogs/token.ts
//
// Zarządzanie tokenem Siri Shortcuts zalogowanego użytkownika.
//   POST   → generuje nowy token (unieważnia poprzedni) i zwraca go JEDEN raz
//   DELETE → unieważnia token

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { generateShortcutToken, hashShortcutToken } from "@/lib/server/shortcutTokens";

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = createServerSupabase(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const admin = adminClient();

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
