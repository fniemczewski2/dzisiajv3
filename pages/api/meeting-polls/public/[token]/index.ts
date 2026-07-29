// pages/api/meeting-polls/public/[token]/index.ts
//
// PUBLICZNY endpoint (bez logowania) — jedyna droga, którą uczestnik może
// odczytać dane ankiety. Celowo NIE idzie przez bezpośrednie zapytanie
// klienckie z kluczem anon: RLS na `meeting_polls` pozwala na SELECT
// wyłącznie właścicielowi (auth.uid() = user_id), więc ten route używa
// klucza SERWISOWEGO (bypass RLS z premedytacją) i sam, w kodzie aplikacji,
// filtruje po share_token — zwracając WYŁĄCZNIE pola bezpieczne do pokazania
// komukolwiek z linkiem (nigdy: user_id organizatora, cudze odpowiedzi).
import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import type { PublicMeetingPoll } from "@/types/meetingPolls";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { token } = req.query;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Brak tokenu ankiety." });
  }

  const { data: poll, error: pollError } = await supabaseAdmin
    .from("meeting_polls")
    .select("id, title, description, slot_duration_minutes, time_start, time_end, status")
    .eq("share_token", token)
    .maybeSingle();

  if (pollError || !poll) {
    return res.status(404).json({ error: "Ankieta nie istnieje." });
  }

  const { data: dateRows, error: datesError } = await supabaseAdmin
    .from("meeting_poll_dates")
    .select("date")
    .eq("poll_id", poll.id)
    .order("date", { ascending: true });

  if (datesError) {
    return res.status(500).json({ error: "Błąd pobierania dat ankiety." });
  }

  const payload: PublicMeetingPoll = {
    title: poll.title,
    description: poll.description,
    slot_duration_minutes: poll.slot_duration_minutes,
    time_start: poll.time_start,
    time_end: poll.time_end,
    dates: (dateRows ?? []).map((d) => d.date as string),
    status: poll.status,
  };

  return res.status(200).json(payload);
}
