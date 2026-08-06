// pages/api/meeting-polls/close-expired.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { verifyCronRequest } from "@/lib/server/cronAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!verifyCronRequest(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

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
    return res.status(500).json({ error: `Nie udało się zamknąć ankiet: ${error.message}` });
  }

  return res.status(200).json({ closed: data?.length ?? 0 });
}