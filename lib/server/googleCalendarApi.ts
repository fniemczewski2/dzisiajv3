// lib/server/googleCalendarApi.ts

const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3/calendars";

/**
 * Builds the Google Calendar events endpoint URL for a calendar, optionally
 * scoped to a single event. Previously this literal was hand-typed in three
 * separate places (sync-calendars.ts, google-calendar/index.ts x2), which
 * would have silently diverged if the API path ever changed in only one spot.
 */
export function buildGoogleEventsUrl(calendarId: string, eventId?: string): string {
  const base = `${GOOGLE_CALENDAR_API_BASE}/${encodeURIComponent(calendarId)}/events`;
  return eventId ? `${base}/${eventId}` : base;
}
