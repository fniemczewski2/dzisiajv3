// pages/api/meeting-polls/public/[token]/slots.ts
//
// Zajętość slotów w ankiecie zapisów (publiczny odczyt): tylko liczby zapisów na slot, bez imion i adresów.

import { CACHE_CONTROL } from "@/config/server";
import { clientIp, enforceRateLimit } from "@/lib/server/rateLimit";
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { countBySlot } from "@/lib/meetingPollSignup";
import type { PublicSignupSlots } from "@/types/meetingPolls";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Metoda niedozwolona." });
  }
  if (!(await enforceRateLimit(res, "pollPublicRead", clientIp(req)))) return;

  const { token } = req.query;
  if (!token || typeof token !== "string") return res.status(400).json({ error: "Brak tokenu ankiety." });

  // Zajętość zmienia się z każdym zapisem – bez buforowania.
  res.setHeader("Cache-Control", CACHE_CONTROL.private);

  const { data: poll } = await supabaseAdmin()
    .from("meeting_polls")
    .select("id, mode, slot_capacity, max_slots_per_person")
    .eq("share_token", token)
    .maybeSingle();
  if (!poll) return res.status(404).json({ error: "Ankieta nie istnieje." });
  if (poll.mode !== "signup") return res.status(409).json({ error: "Ta ankieta nie przyjmuje zapisów na terminy." });

  const { data: rows, error } = await supabaseAdmin()
    .from("meeting_poll_bookings")
    .select("date, start_time")
    .eq("poll_id", poll.id);
  if (error) return res.status(500).json({ error: "Błąd pobierania zajętości terminów." });

  const payload: PublicSignupSlots = {
    capacity: poll.slot_capacity,
    max_per_person: poll.max_slots_per_person,
    slots: countBySlot((rows ?? []) as { date: string; start_time: string }[]),
  };
  return res.status(200).json(payload);
}
