// pages/api/meeting-polls/[id]/responses.ts
//
// DELETE ?responseId=… – organizator ankiety usuwa pojedynczą odpowiedź (z dostępnością).
// Właściciel jest sprawdzany sesją użytkownika; usunięcie kluczem serwera, zawsze z warunkiem na poll_id.

import type { NextApiRequest, NextApiResponse } from "next";
import { CACHE_CONTROL } from "@/config/server";
import { allowMethods, requireUser } from "@/lib/server/apiGuards";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { isUuid } from "@/lib/server/mailRoute";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (!allowMethods(req, res, ["DELETE"])) return;
  res.setHeader("Cache-Control", CACHE_CONTROL.private);
  const { id, responseId } = req.query;
  if (!isUuid(id) || !isUuid(responseId)) {
    res.status(400).json({ error: "Nieprawidłowy identyfikator." });
    return;
  }
  const auth = await requireUser(req, res);
  if (!auth) return;

  const { data: poll } = await auth.supabase.from("meeting_polls").select("id, user_id").eq("id", id).maybeSingle();
  if (!poll) {
    res.status(404).json({ error: "Ankieta nie istnieje." });
    return;
  }
  if (poll.user_id !== auth.user.id) {
    res.status(403).json({ error: "To nie Twoja ankieta." });
    return;
  }

  const admin = supabaseAdmin();
  const { data: response } = await admin
    .from("meeting_poll_responses")
    .select("id")
    .eq("id", responseId)
    .eq("poll_id", id)
    .maybeSingle();
  if (!response) {
    res.status(404).json({ error: "Nie znaleziono odpowiedzi." });
    return;
  }

  const { error: availabilityError } = await admin
    .from("meeting_poll_availabilities")
    .delete()
    .eq("response_id", responseId);
  if (availabilityError) {
    console.error("[meeting-polls/responses] dostępność:", availabilityError.message);
    res.status(500).json({ error: "Nie udało się usunąć odpowiedzi." });
    return;
  }
  const { error } = await admin.from("meeting_poll_responses").delete().eq("id", responseId).eq("poll_id", id);
  if (error) {
    console.error("[meeting-polls/responses] odpowiedź:", error.message);
    res.status(500).json({ error: "Nie udało się usunąć odpowiedzi." });
    return;
  }
  res.status(204).end();
}
