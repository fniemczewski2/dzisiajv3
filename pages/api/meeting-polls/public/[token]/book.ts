// pages/api/meeting-polls/public/[token]/book.ts
//
// Zapis uczestnika na terminy w ankiecie zapisów. Serwer waliduje dane i siatkę terminów, a rezerwację wykonuje
// funkcja bazy book_meeting_poll_slots (blokada ankiety: pojemność slotu i limit na osobę są dotrzymane także przy
// równoczesnych zapisach). Ochrona przed nadużyciami: limit żądań, pułapka na boty, wymagana zgoda.

import { CACHE_CONTROL } from "@/config/server";
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { clientIp, enforceRateLimit } from "@/lib/server/rateLimit";
import { buildAllowedSlotSet, slotKey } from "@/lib/meetingPollGrid";
import {
  bookingFailure,
  SIGNUP_CONSENT_VERSION,
  validateBookingPayload,
  type BookingRpcResult,
} from "@/lib/meetingPollSignup";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", CACHE_CONTROL.private);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metoda niedozwolona." });
  }

  const { token } = req.query;
  if (!token || typeof token !== "string") return res.status(400).json({ error: "Brak tokenu ankiety." });

  const allowed = await enforceRateLimit(
    res,
    "pollBook",
    `${token}:${clientIp(req)}`,
    "Zbyt wiele prób zapisu. Spróbuj ponownie za kilka minut."
  );
  if (!allowed) return;

  const body = req.body as Record<string, unknown> | undefined;
  // Pułapka na boty: ukryte pole wypełnione = udajemy sukces, nic nie zapisując.
  if (typeof body?.website === "string" && body.website !== "") return res.status(200).json({ booked: 0 });

  const validated = validateBookingPayload(body);
  if ("error" in validated) return res.status(400).json({ error: validated.error });

  const { data: poll } = await supabaseAdmin()
    .from("meeting_polls")
    .select("id, mode, status, closes_at, slot_duration_minutes, time_start, time_end")
    .eq("share_token", token)
    .maybeSingle();
  if (!poll) return res.status(404).json({ error: "Ankieta nie istnieje." });
  if (poll.mode !== "signup") return res.status(409).json({ error: "Ta ankieta nie przyjmuje zapisów na terminy." });
  if (poll.status !== "open" || (poll.closes_at && Date.parse(poll.closes_at) <= Date.now())) {
    return res.status(409).json({ error: "Zapisy w tej ankiecie są już zamknięte." });
  }

  const { data: dateRows, error: datesError } = await supabaseAdmin()
    .from("meeting_poll_dates")
    .select("date")
    .eq("poll_id", poll.id);
  if (datesError) return res.status(500).json({ error: "Błąd walidacji terminów ankiety." });

  const allowedSlots = buildAllowedSlotSet(
    (dateRows ?? []).map((d) => d.date as string),
    poll.time_start,
    poll.time_end,
    poll.slot_duration_minutes
  );
  if (validated.slots.some((s) => !allowedSlots.has(slotKey(s.date, s.start_time)))) {
    return res.status(400).json({ error: "Co najmniej jeden wybrany termin jest spoza siatki ankiety." });
  }

  const { data, error } = await supabaseAdmin().rpc("book_meeting_poll_slots", {
    p_poll_id: poll.id,
    p_name: validated.name,
    p_email: validated.email,
    p_slots: validated.slots,
    p_consent_version: SIGNUP_CONSENT_VERSION,
  });
  if (error || !data) return res.status(500).json({ error: "Nie udało się zapisać. Spróbuj ponownie." });

  const result = data as BookingRpcResult;
  if (!result.ok) {
    const failure = bookingFailure(result);
    return res.status(failure.status).json({ error: failure.message, code: result.error });
  }
  return res.status(200).json({ booked: result.booked });
}
