// pages/api/meeting-polls/[id]/finalize.ts
//
// AUTORYZOWANY endpoint (wyłącznie zalogowany WŁAŚCICIEL ankiety). Dla
// każdego finalizowanego terminu:
//   1. tworzy wydarzenie w `events` organizatora (zwykły insert, RLS jak
//      wszędzie: auth.uid() = user_id — organizator zawsze może pisać do
//      WŁASNEGO kalendarza, nie potrzeba tu klucza serwisowego),
//   2. dla KAŻDEGO uczestnika, który (a) wypełniał ankietę będąc zalogowanym
//      [ma zapisane user_id] ORAZ (b) zaznaczył dostępność pokrywającą CAŁY
//      finalizowany przedział — tworzy TAKIE SAMO wydarzenie w JEGO
//      kalendarzu. To jedyne miejsce w tym module, które pisze do CUDZYCH
//      wierszy `events`, więc wymaga klucza SERWISOWEGO (bypass RLS z
//      premedytacją) — autoryzowane tym, że (i) wywołujący jest
//      zweryfikowanym właścicielem TEJ ankiety, (ii) uczestnik sam wcześniej
//      zaznaczył się jako dostępny w tym terminie (to jego wyraźna zgoda
//      wyrażona przy wypełnianiu ankiety, nie decyzja organizatora za niego).
//
// Eksport do kalendarzy ZEWNĘTRZNYCH (Google/Outlook) organizatora NIE jest
// tu obsługiwany — to osobny krok po stronie klienta: klient bierze
// `organizerEventId` z odpowiedzi tego endpointu i woła istniejące
// /api/google-calendar?action=export lub /api/outlook-calendar?action=export
// (ten sam mechanizm, którego reszta aplikacji już używa do eksportu
// dowolnego wydarzenia — bez duplikowania logiki OAuth/Graph/Google API tu).
import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { generateTimeSlots } from "@/lib/meetingPollGrid";
import type { FinalizeRequest, FinalizeResponse, FinalizeResultSlot } from "@/types/meetingPolls";

const MAX_SLOTS_PER_FINALIZE = 20;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { id } = req.query;
  if (!id || typeof id !== "string") return res.status(400).json({ error: "Brak id ankiety." });

  const supabase = createServerSupabase(req, res);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

  // RLS i tak by to wymusił (SELECT na meeting_polls jest ograniczony do
  // właściciela), ale jawne sprawdzenie daje czytelny błąd 403 zamiast
  // mylącego "nie znaleziono" dla kogoś, kto próbuje fałszywego id.
  const { data: poll, error: pollError } = await supabase
    .from("meeting_polls")
    .select("id, user_id, title, slot_duration_minutes")
    .eq("id", id)
    .maybeSingle();

  if (pollError || !poll) return res.status(404).json({ error: "Ankieta nie istnieje." });
  if (poll.user_id !== user.id) return res.status(403).json({ error: "To nie Twoja ankieta." });

  const body = req.body as Partial<FinalizeRequest> | undefined;
  const slots = Array.isArray(body?.slots) ? body.slots : [];
  if (slots.length === 0) return res.status(400).json({ error: "Podaj przynajmniej jeden termin do finalizacji." });
  if (slots.length > MAX_SLOTS_PER_FINALIZE) {
    return res.status(400).json({ error: "Zbyt wiele terminów w jednej finalizacji." });
  }

  // Odpowiedzi + dostępności ankiety, ładowane raz (nie per-slot).
  const { data: responses, error: responsesError } = await supabase
    .from("meeting_poll_responses")
    .select("id, user_id")
    .eq("poll_id", poll.id);
  if (responsesError) return res.status(500).json({ error: "Błąd pobierania odpowiedzi." });

  const responseIds = (responses ?? []).map((r) => r.id);
  const { data: availabilities, error: availError } =
    responseIds.length > 0
      ? await supabase
          .from("meeting_poll_availabilities")
          .select("response_id, date, start_time")
          .in("response_id", responseIds)
      : { data: [], error: null };
  if (availError) return res.status(500).json({ error: "Błąd pobierania dostępności." });

  // Zbiór "response_id|data|godzina" dla szybkiego sprawdzania pokrycia.
  const availabilitySet = new Set(
    (availabilities ?? []).map((a) => `${a.response_id}|${a.date}|${(a.start_time as string).slice(0, 5)}`)
  );

  const results: FinalizeResultSlot[] = [];

  for (const slot of slots) {
    const title = slot.title?.trim() || poll.title;

    // Krok 1: wydarzenie w kalendarzu ORGANIZATORA — zwykły insert,
    // RLS naturalnie na to pozwala (to jego własny wiersz).
    const { data: organizerEvent, error: organizerEventError } = await supabase
      .from("events")
      .insert({
        user_id: user.id,
        title,
        description: `Ustalone na podstawie ankiety „${poll.title}".`,
        start_time: `${slot.date}T${slot.start_time}:00`,
        end_time: `${slot.date}T${slot.end_time}:00`,
        place: slot.place ?? "",
        repeat: "none",
      })
      .select("id")
      .single();

    if (organizerEventError || !organizerEvent) {
      return res.status(500).json({ error: `Błąd tworzenia wydarzenia dla terminu ${slot.date} ${slot.start_time}.` });
    }

    // Krok 2: wymagane sloty siatki pokrywające CAŁY przedział spotkania —
    // uczestnik musi mieć zaznaczone WSZYSTKIE z nich, żeby liczyć się jako
    // dostępny na całe spotkanie (nie tylko na jego fragment).
    const requiredTimes = generateTimeSlots(slot.start_time, slot.end_time, poll.slot_duration_minutes);

    let invitedParticipants = 0;

    for (const response of responses ?? []) {
      if (!response.user_id || response.user_id === user.id) continue; // brak konta albo to sam organizator

      const isFullyAvailable = requiredTimes.every((t) =>
        availabilitySet.has(`${response.id}|${slot.date}|${t}`)
      );
      if (!isFullyAvailable) continue;

      // Zapis do CUDZEGO kalendarza — jedyne miejsce wymagające klucza
      // serwisowego. Autoryzacja: patrz komentarz na górze pliku.
      const { error: participantEventError } = await supabaseAdmin.from("events").insert({
        user_id: response.user_id,
        title,
        description: `Ustalone na podstawie ankiety „${poll.title}".`,
        start_time: `${slot.date}T${slot.start_time}:00`,
        end_time: `${slot.date}T${slot.end_time}:00`,
        place: slot.place ?? "",
        repeat: "none",
      });

      if (!participantEventError) invitedParticipants++;
      // Nieudany insert dla POJEDYNCZEGO uczestnika nie przerywa całej
      // finalizacji — wydarzenie organizatora i pozostali uczestnicy są
      // ważniejsi niż twarde zatrzymanie na jednym błędzie.
    }

    results.push({
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      organizerEventId: organizerEvent.id,
      invitedParticipants,
    });
  }

  const response: FinalizeResponse = { results };
  return res.status(200).json(response);
}
