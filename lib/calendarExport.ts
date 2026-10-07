// lib/calendarExport.ts

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
