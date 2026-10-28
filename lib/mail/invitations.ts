// lib/mail/invitations.ts
//
// Wykrywanie zaproszeń na spotkania: załącznik iCalendar (.ics), linki do konferencji
// oraz wiadomości z zaproszeniem bez załącznika. Czysta logika, bez zależności od sieci.

import type { MailAttachment } from "@/lib/mail/types";

const CONFERENCE_RE =
  /https?:\/\/(?:[\w-]+\.)?(?:zoom\.us|meet\.google\.com|teams\.microsoft\.com|teams\.live\.com|webex\.com)\/[^\s<>"')]+/gi;

const INVITE_HINT_RE = /zaproszen|zaproszenie|invitation|invite|spotkanie|meeting|konferencj|rozmow|webinar/i;

export interface IcsEvent {
  summary: string;
  start: string;
  end: string | null;
  allDay: boolean;
  location: string | null;
  organizer: string | null;
}

export interface Invitation {
  source: "ics" | "link";
  title: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
  location: string | null;
  conferenceLinks: string[];
}

export function findConferenceLinks(text: string): string[] {
  const found = [...text.matchAll(CONFERENCE_RE)].map((m) => m[0].replace(/[.,;]+$/, ""));
  return [...new Set(found)];
}

function unfold(src: string): string[] {
  return src
    .replace(/\r?\n[ \t]/g, "")
    .split(/\r?\n/)
    .filter((l) => l.length > 0);
}

interface IcsProp {
  value: string;
  params: Record<string, string>;
}

function readPropFull(lines: string[], name: string): IcsProp | null {
  const upper = name.toUpperCase();
  const line = lines.find((l) => {
    const u = l.toUpperCase();
    return u.startsWith(`${upper}:`) || u.startsWith(`${upper};`);
  });
  if (!line) return null;
  const colon = line.indexOf(":");
  const params: Record<string, string> = {};
  for (const part of line.slice(0, colon).split(";").slice(1)) {
    const eq = part.indexOf("=");
    if (eq > 0) params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1).replaceAll('"', "");
  }
  return { value: line.slice(colon + 1).trim(), params };
}

function readProp(lines: string[], name: string): string | null {
  return readPropFull(lines, name)?.value ?? null;
}

/** Przesunięcie strefy IANA względem UTC (minuty) w danym momencie; null dla nieznanej strefy. */
function zoneOffsetMinutes(timeZone: string, instantMs: number): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(instantMs));
    const p: Record<string, number> = {};
    for (const part of parts) if (part.type !== "literal") p[part.type] = Number(part.value);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return Math.round((asUtc - instantMs) / 60_000);
  } catch {
    return null;
  }
}

/**
 * Czas ścienny w strefie IANA → moment UTC („…Z”). Dla nazw spoza IANA (np. stref Windows) zwraca null –
 * wtedy czas zostaje potraktowany jako czas polski.
 */
export function zonedWallTimeToUtc(naiveIso: string, timeZone: string): string | null {
  const guess = Date.parse(`${naiveIso}Z`);
  if (Number.isNaN(guess)) return null;
  const first = zoneOffsetMinutes(timeZone, guess);
  if (first === null) return null;
  let instant = guess - first * 60_000;
  const second = zoneOffsetMinutes(timeZone, instant);
  if (second !== null && second !== first) instant = guess - second * 60_000;
  return new Date(instant).toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Wartość DTSTART/DTEND z uwzględnieniem parametru TZID. */
function icsInstant(prop: IcsProp | null): { iso: string; allDay: boolean } | null {
  if (!prop) return null;
  const parsed = parseIcsDate(prop.value);
  if (!parsed || parsed.allDay || parsed.iso.endsWith("Z")) return parsed;
  const tzid = prop.params.TZID;
  if (!tzid || tzid === "Europe/Warsaw") return parsed;
  const utc = zonedWallTimeToUtc(parsed.iso, tzid);
  return utc ? { iso: utc, allDay: false } : parsed;
}

/** Zamienia wartość DTSTART/DTEND z iCalendar na ISO (data, czas lokalny lub UTC). */
export function parseIcsDate(value: string): { iso: string; allDay: boolean } | null {
  const date = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (date) return { iso: `${date[1]}-${date[2]}-${date[3]}`, allDay: true };
  const dt = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value);
  if (!dt) return null;
  const iso = `${dt[1]}-${dt[2]}-${dt[3]}T${dt[4]}:${dt[5]}:${dt[6]}${dt[7]}`;
  return { iso, allDay: false };
}

/** Pierwszy VEVENT z treści .ics; null gdy brak daty początku. */
export function parseIcs(text: string): IcsEvent | null {
  const lines = unfold(text);
  const begin = lines.findIndex((l) => l.toUpperCase() === "BEGIN:VEVENT");
  const end = lines.findIndex((l, i) => i > begin && l.toUpperCase() === "END:VEVENT");
  if (begin === -1 || end === -1) return null;
  const event = lines.slice(begin + 1, end);

  const start = icsInstant(readPropFull(event, "DTSTART"));
  if (!start) return null;
  const finish = icsInstant(readPropFull(event, "DTEND"));
  const organizer = readProp(event, "ORGANIZER");

  return {
    summary: readProp(event, "SUMMARY") ?? "",
    start: start.iso,
    end: finish?.iso ?? null,
    allDay: start.allDay,
    location: readProp(event, "LOCATION"),
    organizer: organizer ? organizer.replace(/^mailto:/i, "") : null,
  };
}

export interface InvitationMessage {
  subject: string;
  text: string;
  attachments: (MailAttachment & { icsText?: string })[];
}

/** Zwraca zaproszenie, jeśli wiadomość je zawiera; w przeciwnym razie null. */
export function detectInvitation(message: InvitationMessage): Invitation | null {
  const ics = message.attachments.find(
    (a) => a.icsText && (a.mimeType.toLowerCase() === "text/calendar" || a.filename.toLowerCase().endsWith(".ics"))
  );
  const links = findConferenceLinks(message.text);

  if (ics?.icsText) {
    const event = parseIcs(ics.icsText);
    if (event) {
      return {
        source: "ics",
        title: event.summary || message.subject,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
        location: event.location,
        conferenceLinks: links,
      };
    }
  }

  if (links.length > 0 && INVITE_HINT_RE.test(`${message.subject}\n${message.text}`)) {
    return {
      source: "link",
      title: message.subject,
      start: null,
      end: null,
      allDay: false,
      location: null,
      conferenceLinks: links,
    };
  }
  return null;
}
