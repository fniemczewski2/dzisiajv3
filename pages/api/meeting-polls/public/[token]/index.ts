// pages/api/meeting-polls/public/[token]/index.ts

import { CACHE_CONTROL } from "@/config/server";
import { clientIp, enforceRateLimit } from "@/lib/server/rateLimit";
import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import type { PublicMeetingPoll } from "@/types/meetingPolls";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Metoda niedozwolona." });
  }
  if (!(await enforceRateLimit(res, "pollPublicRead", clientIp(req)))) return;

  const { token } = req.query;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Brak tokenu ankiety." });
  }

  const { data: poll, error: pollError } = await supabaseAdmin()
    .from("meeting_polls")
    .select("id, title, description, slot_duration_minutes, time_start, time_end, status")
    .eq("share_token", token)
    .maybeSingle();

  if (pollError || !poll) {
    res.setHeader("Cache-Control", CACHE_CONTROL.private);
    return res.status(404).json({ error: "Ankieta nie istnieje." });
  }

  const { data: dateRows, error: datesError } = await supabaseAdmin()
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

  res.setHeader("Cache-Control", CACHE_CONTROL.publicPoll);
  return res.status(200).json(payload);
}
