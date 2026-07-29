// pages/api/meeting-polls/public/[token]/respond.ts
//
// PUBLICZNY endpoint (bez logowania) do zapisu/edycji odpowiedzi uczestnika.
// Jedyna droga zapisu do meeting_poll_responses/meeting_poll_availabilities
// — te tabele NIE MAJĄ żadnej polityki RLS insert/update dla nikogo (ani
// anon, ani zalogowanych), więc zapis idzie tu przez klucz serwisowy, PO
// walidacji w kodzie aplikacji:
//   - ankieta o podanym share_token istnieje i ma status 'open',
//   - wszystkie przesłane sloty mieszczą się w dozwolonej siatce ankiety
//     (klient mógłby przysłać cokolwiek — nie ufamy samym wartościom),
//   - respondent_name jest niepuste.
//
// Jeśli w żądaniu jest ciasteczko sesji Supabase (uczestnik akurat jest
// zalogowany w tej samej przeglądarce/domenie, choć strona TEGO nie
// wymaga), automatycznie dopinamy jego user_id do odpowiedzi — dzięki
// temu finalizacja terminu (patrz [id]/finalize.ts) może później dopisać
// wydarzenie także do JEGO kalendarza. Nigdy nie ufamy user_id z body.
//
// EDYCJA: jeśli w body przyjdzie `edit_token` pasujący do istniejącej
// odpowiedzi W TEJ ankiecie, aktualizujemy ją (usuń stare sloty, wstaw
// nowe) zamiast tworzyć duplikat. `edit_token` jest zwracany uczestnikowi
// przy pierwszym zapisie i trzymany w jego przeglądarce (localStorage) —
// to jego "hasło" do własnej odpowiedzi, analogiczne do share_token całej
// ankiety, weryfikowane tu w kodzie, nie przez RLS.
import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { buildAllowedSlotSet, slotKey } from "@/lib/meetingPollGrid";
import type {
  MeetingPollResponsePayload,
  MeetingPollResponseSubmitResult,
  MeetingPollSlot,
} from "@/types/meetingPolls";

const MAX_RESPONDENT_NAME_LENGTH = 100;
const MAX_SLOTS_PER_RESPONSE = 500; // sanity cap — nawet bardzo szeroka siatka nie zbliża się do tego

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

/** Zwraca WŁASNĄ (i tylko własną) odpowiedź uczestnika po edit_token —
 * potrzebne, żeby formularz mógł się wypełnić poprzednim wyborem, gdy
 * uczestnik wraca edytować swoją dostępność. Token jest dodatkowo
 * scope'owany do share_token z URL-a (nie tylko globalnie unikalny), żeby
 * literówka/pomyłka nie ujawniła odpowiedzi z zupełnie innej ankiety. */
async function handleGet(req: NextApiRequest, res: NextApiResponse, token: string) {
  const editToken = req.query.edit_token;
  if (!editToken || typeof editToken !== "string") {
    return res.status(400).json({ error: "Brak tokenu edycji." });
  }

  const { data: poll } = await supabaseAdmin
    .from("meeting_polls")
    .select("id")
    .eq("share_token", token)
    .maybeSingle();
  if (!poll) return res.status(404).json({ error: "Ankieta nie istnieje." });

  const { data: existing } = await supabaseAdmin
    .from("meeting_poll_responses")
    .select("id, respondent_name, respondent_email")
    .eq("poll_id", poll.id)
    .eq("edit_token", editToken)
    .maybeSingle();
  if (!existing) return res.status(404).json({ error: "Nie znaleziono odpowiedzi." });

  const { data: availRows } = await supabaseAdmin
    .from("meeting_poll_availabilities")
    .select("date, start_time")
    .eq("response_id", existing.id);

  const slots: MeetingPollSlot[] = (availRows ?? []).map((a) => ({
    date: a.date,
    start_time: (a.start_time as string).slice(0, 5),
  }));

  return res.status(200).json({
    respondent_name: existing.respondent_name,
    respondent_email: existing.respondent_email,
    slots,
  });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, token: string) {
  const body = req.body as Partial<MeetingPollResponsePayload> | undefined;
  const respondentName = body?.respondent_name?.trim();
  const respondentEmail = body?.respondent_email?.trim() || null;
  const slots = Array.isArray(body?.slots) ? body.slots : [];
  const editToken = typeof body?.edit_token === "string" ? body.edit_token : undefined;

  if (!respondentName || respondentName.length > MAX_RESPONDENT_NAME_LENGTH) {
    return res.status(400).json({ error: "Podaj poprawne imię (do 100 znaków)." });
  }
  if (slots.length === 0) {
    return res.status(400).json({ error: "Zaznacz przynajmniej jeden dostępny termin." });
  }
  if (slots.length > MAX_SLOTS_PER_RESPONSE) {
    return res.status(400).json({ error: "Zbyt wiele zaznaczonych terminów." });
  }

  const { data: poll, error: pollError } = await supabaseAdmin
    .from("meeting_polls")
    .select("id, status, slot_duration_minutes, time_start, time_end")
    .eq("share_token", token)
    .maybeSingle();

  if (pollError || !poll) {
    return res.status(404).json({ error: "Ankieta nie istnieje." });
  }
  if (poll.status !== "open") {
    return res.status(409).json({ error: "Ta ankieta nie przyjmuje już odpowiedzi." });
  }

  const { data: dateRows, error: datesError } = await supabaseAdmin
    .from("meeting_poll_dates")
    .select("date")
    .eq("poll_id", poll.id);
  if (datesError) {
    return res.status(500).json({ error: "Błąd walidacji terminów ankiety." });
  }

  // Nigdy nie ufamy slotom przysłanym przez klienta — muszą mieścić się
  // dokładnie w siatce zbudowanej z parametrów TEJ ankiety.
  const allowed = buildAllowedSlotSet(
    (dateRows ?? []).map((d) => d.date as string),
    poll.time_start,
    poll.time_end,
    poll.slot_duration_minutes
  );
  const invalidSlot = slots.find((s) => !allowed.has(slotKey(s.date, s.start_time)));
  if (invalidSlot) {
    return res.status(400).json({ error: "Co najmniej jeden zaznaczony termin jest spoza siatki ankiety." });
  }

  // Automatyczne dopięcie user_id, TYLKO jeśli uczestnik ma aktywną sesję —
  // nigdy z danych przesłanych przez klienta.
  let sessionUserId: string | null = null;
  try {
    const sessionClient = createServerSupabase(req, res);
    const { data: { user } } = await sessionClient.auth.getUser();
    sessionUserId = user?.id ?? null;
  } catch {
    sessionUserId = null;
  }

  let responseId: string;
  let responseEditToken: string;

  if (editToken) {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("meeting_poll_responses")
      .select("id")
      .eq("poll_id", poll.id)
      .eq("edit_token", editToken)
      .maybeSingle();

    if (existingError || !existing) {
      return res.status(403).json({ error: "Nieprawidłowy token edycji odpowiedzi." });
    }

    const { error: updateError } = await supabaseAdmin
      .from("meeting_poll_responses")
      .update({ respondent_name: respondentName, respondent_email: respondentEmail, user_id: sessionUserId })
      .eq("id", existing.id);
    if (updateError) {
      return res.status(500).json({ error: "Błąd zapisu odpowiedzi." });
    }

    // Prościej i bezpieczniej niż diff: usuń wszystkie stare sloty i wstaw
    // nowe w jednej operacji — liczba slotów per uczestnik jest mała.
    const { error: deleteError } = await supabaseAdmin
      .from("meeting_poll_availabilities")
      .delete()
      .eq("response_id", existing.id);
    if (deleteError) {
      return res.status(500).json({ error: "Błąd aktualizacji dostępności." });
    }

    responseId = existing.id;
    responseEditToken = editToken;
  } else {
    const newEditToken = crypto.randomUUID();
    const { data: created, error: insertError } = await supabaseAdmin
      .from("meeting_poll_responses")
      .insert({
        poll_id: poll.id,
        respondent_name: respondentName,
        respondent_email: respondentEmail,
        user_id: sessionUserId,
        edit_token: newEditToken,
      })
      .select("id")
      .single();

    if (insertError || !created) {
      return res.status(500).json({ error: "Błąd zapisu odpowiedzi." });
    }

    responseId = created.id;
    responseEditToken = newEditToken;
  }

  const rows = slots.map((s) => ({
    response_id: responseId,
    date: s.date,
    start_time: s.start_time,
  }));

  const { error: availError } = await supabaseAdmin.from("meeting_poll_availabilities").insert(rows);
  if (availError) {
    // Odpowiedź istnieje, ale bez slotów — sprzątamy, żeby nie zostawić
    // "pustego" wiersza uczestnika w wynikach organizatora. Dla ścieżki
    // edycji nie usuwamy CAŁEJ odpowiedzi (respondent mógłby stracić
    // swój edit_token po stronie serwera), tylko zgłaszamy błąd — klient
    // pokaże komunikat i pozwoli spróbować ponownie z tym samym edit_token.
    if (!editToken) {
      await supabaseAdmin.from("meeting_poll_responses").delete().eq("id", responseId);
    }
    return res.status(500).json({ error: "Błąd zapisu dostępności." });
  }

  const result: MeetingPollResponseSubmitResult = { edit_token: responseEditToken };
  return res.status(200).json(result);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Brak tokenu ankiety." });
  }

  if (req.method === "GET") return handleGet(req, res, token);
  if (req.method === "POST") return handlePost(req, res, token);
  return res.status(405).json({ error: "Method not allowed" });
}
