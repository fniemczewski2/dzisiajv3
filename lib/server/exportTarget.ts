// lib/server/exportTarget.ts
//
// Docelowy kalendarz przy wysyłaniu wydarzeń z aplikacji do Google/Outlooka.
//
// Klient podaje id wiersza connected_calendars (ten sam, który wybiera w polu
// „Dodaj do”). Z niego bierzemy identyfikator kalendarza u dostawcy oraz konto
// – wcześniej endpoint brał pierwsze podłączone konto danego dostawcy, więc
// przy dwóch kontach Google wydarzenie mogło trafić nie tam.

import type { SupabaseClient } from "@supabase/supabase-js";

export interface ExportTarget {
  /** connected_calendars.id – zapisywany w events.calendar_id. */
  rowId: string;
  /** Identyfikator kalendarza u dostawcy (kolumna google_calendar_id). */
  calendarId: string;
  accountEmail: string;
}

export async function resolveExportTarget(
  sb: SupabaseClient,
  userId: string,
  provider: "google" | "outlook",
  connectedCalendarId: unknown
): Promise<ExportTarget | null> {
  if (typeof connectedCalendarId !== "string" || !connectedCalendarId) return null;
  const { data } = await sb
    .from("connected_calendars")
    .select("id, google_calendar_id, account_email")
    .eq("id", connectedCalendarId)
    .eq("user_id", userId)
    .eq("provider", provider)
    .neq("google_calendar_id", "@account_connection")
    .maybeSingle<{ id: string; google_calendar_id: string; account_email: string }>();
  if (!data) return null;
  return { rowId: data.id, calendarId: data.google_calendar_id, accountEmail: data.account_email };
}

export interface ExportCandidate {
  repeat?: string | null;
  calendar_id?: string | null;
}

/**
 * Czy wydarzenie można przypiąć do docelowego kalendarza.
 *  - Cykliczne: nie. Wysłalibyśmy pojedyncze wystąpienie, a cron synchronizacji
 *    nadpisałby potem w aplikacji `repeat` na "none" – powtarzanie by zniknęło.
 *  - Należące już do innego zewnętrznego kalendarza: nie – zmiana calendar_id
 *    zerwałaby powiązanie z tamtym kalendarzem.
 */
export function canAttachToTarget(ev: ExportCandidate, target: ExportTarget): boolean {
  if (ev.repeat && ev.repeat !== "none") return false;
  return !ev.calendar_id || ev.calendar_id === target.rowId;
}
