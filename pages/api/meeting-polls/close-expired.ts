// pages/api/meeting-polls/close-expired.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { verifyCronRequest } from "@/lib/server/cronAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!verifyCronRequest(req)) {
    return res.status(401).json({ error: "Brak autoryzacji." });
  }

  const admin = supabaseAdmin();

  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("meeting_polls")
    .update({ status: "closed", updated_at: now })
    .eq("status", "open")
    .not("closes_at", "is", null)
    .lte("closes_at", now)
    .select("id");

  if (error) {
    console.error("[meeting-polls/close-expired]:", error.message);
    return res.status(500).json({ error: "Nie udało się zamknąć ankiet." });
  }

  return res.status(200).json({ closed: data?.length ?? 0 });
}
