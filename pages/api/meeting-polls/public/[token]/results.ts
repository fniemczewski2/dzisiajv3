// pages/api/meeting-polls/public/[token]/results.ts

import { CACHE_CONTROL, POLL_EDIT_TOKEN_HEADER } from "@/config/server";
import { NextApiRequest, NextApiResponse } from "next";
import { clientIp, enforceRateLimit } from "@/lib/server/rateLimit";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { summarizeResponses } from "@/lib/meetingPollResults";

/**
 * Wyniki ankiety dla osoby, która już odpowiedziała. Dostęp wymaga tokenu edycji
 * (nagłówek), czyli dowodu, że odpowiedź została wysłana, oraz włączenia opcji przez organizatora.
 * Zwracane są tylko liczby osób dla każdego terminu – bez imion i adresów innych uczestników.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Metoda niedozwolona." });
  }
  if (!(await enforceRateLimit(res, "pollPublicRead", clientIp(req)))) return;
  res.setHeader("Cache-Control", CACHE_CONTROL.private);

  const { token } = req.query;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Brak tokenu ankiety." });
  }
  const editToken = req.headers[POLL_EDIT_TOKEN_HEADER];
  if (!editToken || typeof editToken !== "string") {
    return res.status(400).json({ error: "Brak tokenu edycji." });
  }

  const { data: poll, error: pollError } = await supabaseAdmin()
    .from("meeting_polls")
    .select("id, show_results_to_respondents")
    .eq("share_token", token)
    .maybeSingle();
  if (pollError || !poll) return res.status(404).json({ error: "Ankieta nie istnieje." });

  if (!poll.show_results_to_respondents) {
    return res.status(403).json({ error: "Organizator nie udostępnił wyników uczestnikom." });
  }

  const { data: mine, error: mineError } = await supabaseAdmin()
    .from("meeting_poll_responses")
    .select("id")
    .eq("poll_id", poll.id)
    .eq("edit_token", editToken)
    .maybeSingle();
  if (mineError) return res.status(500).json({ error: "Błąd pobierania wyników." });
  if (!mine) return res.status(404).json({ error: "Nie znaleziono odpowiedzi." });

  const { data: responses, error: responsesError } = await supabaseAdmin()
    .from("meeting_poll_responses")
    .select("id")
    .eq("poll_id", poll.id);
  if (responsesError) return res.status(500).json({ error: "Błąd pobierania wyników." });
  const responseIds = (responses ?? []).map((r) => r.id as string);

  let availabilities: { response_id: string; date: string; start_time: string }[] = [];
  if (responseIds.length > 0) {
    const { data: rows, error: availError } = await supabaseAdmin()
      .from("meeting_poll_availabilities")
      .select("response_id, date, start_time")
      .in("response_id", responseIds);
    if (availError) return res.status(500).json({ error: "Błąd pobierania wyników." });
    availabilities = (rows ?? []) as typeof availabilities;
  }

  return res.status(200).json(summarizeResponses(responseIds, availabilities));
}
