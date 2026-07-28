// lib/server/calendarTime.ts
//
// Jedno źródło prawdy dla konwersji czasu wydarzeń z zewnętrznych kalendarzy
// (Google / Outlook) do formatu zapisywanego w Supabase.
//
// KONWENCJA APLIKACJI (udokumentowana przez konsumentów, m.in. Edge Function
// process-notifications, która robi `like('start_time', '${today}%')` i
// porównuje start_time z lokalnymi stringami): kolumny events.start_time /
// end_time przechowują NAIWNY czas lokalny Europe/Warsaw w formacie
// `YYYY-MM-DDTHH:mm:ss`, bez strefy.
//
// Naprawiane błędy historyczne:
// 1. `google-calendar/index.ts` robił `dateTime.slice(0, 19) + "+00:00"` —
//    deklarował lokalny czas wydarzenia jako UTC (przesunięcie o offset).
// 2. `calendar/sync-calendars.ts` obcinał offset ze stringa — działało
//    poprawnie TYLKO gdy strefa wydarzenia w źródle była akurat warszawska;
//    event wpisany w kalendarzu w innej strefie (podróż, zaproszenie z
//    zagranicy) lądował o złej godzinie.
//
// Teraz: liczymy rzeczywisty instant z pełnego ISO (z offsetem źródła),
// a następnie formatujemy go jako czas ścienny Europe/Warsaw przez Intl
// (poprawna obsługa DST). Wydarzenia całodniowe pozostają czystymi datami —
// dzień urodzin nie może się przesuwać ze strefą.

import type { GoogleEventDateTime } from "@/types/googleCalendar";

const WARSAW_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Warsaw",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** Instant (Date) -> naiwny czas ścienny Europe/Warsaw `YYYY-MM-DDTHH:mm:ss`. */
export function instantToWarsawNaive(instant: Date): string {
  const parts = WARSAW_FORMATTER.formatToParts(instant);
  const p: Record<string, string> = {};
  for (const part of parts) p[part.type] = part.value;
  // Niektóre silniki formatują północ jako "24" przy hourCycle h24.
  const hour = p.hour === "24" ? "00" : p.hour;
  return `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}:${p.second}`;
}

/** Data całodniowa: koniec w Google API jest ekskluzywny, więc cofamy o 1 dzień. */
function allDayToNaive(date: string, isEndTime: boolean): string {
  if (!isEndTime) return `${date}T00:00:00`;

  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}T23:59:59`;
}

/**
 * Czas wydarzenia Google -> wartość dla kolumny w Supabase.
 * - `dateTime` (event z godziną): naiwny czas ścienny Europe/Warsaw wyliczony
 *   z rzeczywistego instantu (offset źródła jest respektowany).
 * - `date` (event całodniowy): naiwna data bez strefy.
 */
export function toSupabaseTime(
  dt: GoogleEventDateTime | undefined,
  isEndTime = false
): string {
  if (dt?.dateTime) {
    const parsed = new Date(dt.dateTime);
    if (!Number.isNaN(parsed.getTime())) return instantToWarsawNaive(parsed);
  }
  if (dt?.date) return allDayToNaive(dt.date, isEndTime);
  return instantToWarsawNaive(new Date());
}

/**
 * Czas wydarzenia Outlook (Graph z `Prefer: outlook.timezone="UTC"` zwraca
 * dateTime bez sufiksu strefy, ale w UTC) -> naiwny czas Europe/Warsaw.
 */
export function outlookToSupabaseTime(dateTime: string): string {
  const hasZone = /(?:Z|[+-]\d{2}:\d{2})$/.test(dateTime);
  const parsed = new Date(hasZone ? dateTime : `${dateTime}Z`);
  if (Number.isNaN(parsed.getTime())) return instantToWarsawNaive(new Date());
  return instantToWarsawNaive(parsed);
}
