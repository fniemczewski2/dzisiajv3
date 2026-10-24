// lib/meetingPollResults.ts
//
// Agregacja wyników ankiety dla osoby uczestniczącej: ile osób zaznaczyło każdy termin.
// Czysta funkcja (bez Supabase), używana przez endpoint /results i testowana osobno.

import type { RespondentPollResults } from "@/types/meetingPolls";

export interface AvailabilityRowLike {
  response_id: string;
  date: string;
  start_time: string;
}

export function summarizeResponses(
  responseIds: readonly string[],
  rows: readonly AvailabilityRowLike[]
): RespondentPollResults {
  const respondentSet = new Set(responseIds);
  const counts = new Map<string, { date: string; start_time: string; respondents: Set<string> }>();

  for (const row of rows) {
    // Wiersz z odpowiedzi spoza listy (np. usuniętej w międzyczasie) nie liczy się.
    if (!respondentSet.has(row.response_id)) continue;
    const start = row.start_time.slice(0, 5);
    const key = `${row.date}T${start}`;
    const bucket = counts.get(key) ?? { date: row.date, start_time: start, respondents: new Set<string>() };
    bucket.respondents.add(row.response_id);
    counts.set(key, bucket);
  }

  const slots = [...counts.values()]
    .map((b) => ({ date: b.date, start_time: b.start_time, count: b.respondents.size }))
    .sort((a, b) => (a.date === b.date ? a.start_time.localeCompare(b.start_time) : a.date.localeCompare(b.date)));

  return { respondents: respondentSet.size, slots };
}

export function isRespondentResults(value: unknown): value is RespondentPollResults {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.respondents === "number" && Array.isArray(v.slots);
}
