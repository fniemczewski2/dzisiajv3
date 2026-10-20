// lib/calendarExport.ts

import type { SupabaseClient } from "@supabase/supabase-js";

export interface CalendarTarget {
  /** connected_calendars.id */
  id: string;
  provider: "google" | "outlook";
  google_calendar_id: string;
  calendar_name: string | null;
}

export function calendarTargetLabel(target: CalendarTarget): string {
  const provider = target.provider === "google" ? "Google" : "Outlook";
  return `${provider}: ${target.calendar_name || target.google_calendar_id}`;
}

export async function exportEventToCalendar(
  target: CalendarTarget,
  eventId: string,
  accessToken: string
): Promise<boolean> {
  const endpoint = target.provider === "google" ? "/api/google-calendar" : "/api/outlook-calendar";
  try {
    const response = await fetch(`${endpoint}?action=export`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ connectedCalendarId: target.id, eventIds: [eventId] }),
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { exported?: number };
    return body.exported === 1;
  } catch {
    return false;
  }
}

async function deleteEventFromCalendar(target: CalendarTarget, eventId: string, accessToken: string): Promise<boolean> {
  const endpoint = target.provider === "google" ? "/api/google-calendar" : "/api/outlook-calendar";
  try {
    const response = await fetch(`${endpoint}?action=delete-remote`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ eventId }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export interface LinkedEventSyncResult {
  /** Wydarzenie jest powiązane z kalendarzem zewnętrznym (Google / Outlook). */
  linked: boolean;
  ok: boolean;
  /** Nazwa kalendarza do komunikatu. */
  label?: string;
}

/**
 * Przeniesienie edycji lub usunięcia wydarzenia z aplikacji do powiązanego
 * kalendarza zewnętrznego. Tylko wydarzenia właściciela (udostępnione mu nie są
 * jego wpisami w Google/Outlooku). Niepowiązane: { linked: false, ok: true }.
 */
export async function syncLinkedEventChange(
  supabase: SupabaseClient,
  event: { id: string; user_id?: string; google_event_id?: string | null; calendar_id?: string | null },
  action: "update" | "delete",
  userId: string
): Promise<LinkedEventSyncResult> {
  if (!event.google_event_id || !event.calendar_id || (event.user_id && event.user_id !== userId)) {
    return { linked: false, ok: true };
  }
  const { data: calendar } = await supabase
    .from("connected_calendars")
    .select("id, provider, google_calendar_id, calendar_name")
    .eq("id", event.calendar_id)
    .maybeSingle<CalendarTarget>();
  if (!calendar) return { linked: true, ok: false };
  const label = calendarTargetLabel(calendar);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { linked: true, ok: false, label };

  const ok =
    action === "update"
      ? await exportEventToCalendar(calendar, event.id, session.access_token)
      : await deleteEventFromCalendar(calendar, event.id, session.access_token);
  return { linked: true, ok, label };
}
