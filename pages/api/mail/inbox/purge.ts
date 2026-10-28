// pages/api/mail/inbox/purge.ts
//
// Usuwa wygasłe wiadomości z bufora. Wywoływane przez harmonogram (sekret CRON).

import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods } from "@/lib/server/apiGuards";
import { verifyCronRequest } from "@/lib/server/cronAuth";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET", "POST"])) return;
  if (!verifyCronRequest(req)) return res.status(401).json({ error: "Brak autoryzacji." });

  const { data, error } = await supabaseAdmin()
    .from("mail_inbox")
    .delete()
    .lte("expires_at", new Date().toISOString())
    .select("id");
  if (error) return res.status(500).json({ error: "Nie udało się wyczyścić bufora." });
  return res.status(200).json({ deleted: data?.length ?? 0 });
}
