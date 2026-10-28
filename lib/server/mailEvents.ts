// lib/server/mailEvents.ts
//
// Wiersz wydarzenia z zaproszenia w formacie aplikacji: czas polski „YYYY-MM-DDTHH:MM:SS”
// (jak finalizacja ankiet i synchronizacja kalendarzy), brak miejsca = pusty tekst.

import { outlookToSupabaseTime } from "@/lib/server/calendarTime";
import type { Invitation } from "@/lib/mail/invitations";
import { MAX_PLACE_LENGTH, MAX_TITLE_LENGTH } from "@/config/limits";

export interface MailEventRow {
  title: string;
  start_time: string;
  end_time: string;
  place: string;
  description: string;
  user_id: string;
  repeat: "none";
}

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** Moment ze strefą (Z albo ±hh:mm) → czas polski; czas bez strefy jest już czasem polskim. */
function toWarsawNaive(value: string): string {
  return /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? outlookToSupabaseTime(value) : value;
}

function addMs(naive: string, ms: number): string {
  return new Date(Date.parse(`${naive}Z`) + ms).toISOString().slice(0, 19);
}

export function buildMailEventRow(invitation: Invitation, userId: string): { row: MailEventRow } | { error: string } {
  if (!invitation.start) return { error: "W wiadomości nie ma daty wydarzenia." };

  let start: string;
  let end: string;
  if (invitation.allDay) {
    start = `${invitation.start}T00:00:00`;
    end = invitation.end ? `${invitation.end}T00:00:00` : addMs(start, DAY_MS);
  } else {
    start = toWarsawNaive(invitation.start);
    end = invitation.end ? toWarsawNaive(invitation.end) : addMs(start, HOUR_MS);
  }

  return {
    row: {
      title: (invitation.title || "Spotkanie").slice(0, MAX_TITLE_LENGTH),
      start_time: start,
      end_time: end,
      place: (invitation.location ?? invitation.conferenceLinks[0] ?? "").slice(0, MAX_PLACE_LENGTH),
      description: invitation.conferenceLinks.join("\n").slice(0, 2000),
      user_id: userId,
      repeat: "none",
    },
  };
}
