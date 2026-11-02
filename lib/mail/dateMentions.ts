// lib/mail/dateMentions.ts
//
// Wykrywanie terminu w treści wiadomości (gdy nie ma pliku .ics) – podstawa podpowiedzi „Dodaj wydarzenie”.
// Formaty: 27.10.2026, 27-10-2026, 2026-10-27, „27 października 2026”, „27 października” (najbliższy przyszły),
// z opcjonalną godziną („o 10:00”, „godz. 10.00”) i końcem („10:00–11:30”).
// Pomijane: cytowana historia odpowiedzi i daty przeszłe. Czas jest czasem polskim (bez strefy).
// Parsowanie bez złożonych wyrażeń regularnych – treść maila może być długa i nie może powodować nawracania.

const MONTHS: Record<string, number> = {
  stycznia: 1,
  lutego: 2,
  marca: 3,
  kwietnia: 4,
  maja: 5,
  czerwca: 6,
  lipca: 7,
  sierpnia: 8,
  września: 9,
  października: 10,
  listopada: 11,
  grudnia: 12,
};

export interface DateMention {
  /** „YYYY-MM-DD” (cały dzień) albo „YYYY-MM-DDTHH:MM:00” (czas polski). */
  start: string;
  end: string | null;
  allDay: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");
const SEPARATOR_MARKERS = ["original message", "wiadomość oryginalna", "forwarded message", "wiadomość przekazana"];

/** Czy linia zaczyna cytowaną historię (cytat, oddzielenie, nagłówek odpowiedzi lub przekazania). */
function isQuoteStart(line: string): boolean {
  const t = line.trim().toLowerCase();
  if (t.startsWith(">")) return true;
  if (t.startsWith("--") && SEPARATOR_MARKERS.some((m) => t.includes(m))) return true;
  if (t.startsWith("od:") || t.startsWith("from:")) return true;
  const replyHeader = t.startsWith("w dniu ") || t.startsWith("on ");
  return replyHeader && t.endsWith(":") && (t.includes("napisał") || t.includes("wrote"));
}

function stripQuoted(text: string): string {
  const lines = text.split("\n");
  const cut = lines.findIndex(isQuoteStart);
  return cut < 0 ? text : lines.slice(0, cut).join("\n");
}

function validDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

const TIME_PREFIXES = ["w godz.", "w godz", "godzina", "godz.", "godz", "o"];
const CLOCK = /^(\d{1,2})[:.](\d{2})/;
const RANGE_DASH = /^\s*[-–—]\s*/;

/** Godzina (i opcjonalny koniec) zaraz po dacie: „, r., godz. 10:00–11:30”. */
function timeAfter(text: string): { start: [number, number]; end: [number, number] | null } | null {
  let rest = text.replace(/^[\s,]+/, "");
  if (rest.toLowerCase().startsWith("r.")) rest = rest.slice(2).replace(/^[\s,]+/, "");
  const prefix = TIME_PREFIXES.find((p) => rest.toLowerCase().startsWith(p));
  if (prefix) rest = rest.slice(prefix.length).trimStart();
  const start = CLOCK.exec(rest);
  if (!start) return null;
  rest = rest.slice(start[0].length);
  const dash = RANGE_DASH.exec(rest);
  const end = dash ? CLOCK.exec(rest.slice(dash[0].length)) : null;
  return {
    start: [Number(start[1]), Number(start[2])],
    end: end ? [Number(end[1]), Number(end[2])] : null,
  };
}

const validClock = ([h, m]: [number, number]) => h < 24 && m < 60;

type DateParser = (m: RegExpExecArray, today: Date) => [number, number, number];

const DATE_PATTERNS: { re: RegExp; parse: DateParser }[] = [
  { re: /\b(\d{4})-(\d{2})-(\d{2})\b/g, parse: (m) => [Number(m[1]), Number(m[2]), Number(m[3])] },
  { re: /\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/g, parse: (m) => [Number(m[3]), Number(m[2]), Number(m[1])] },
  {
    re: /\b(\d{1,2}) (stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia)( \d{4})?/gi,
    parse: (m, today) => {
      const day = Number(m[1]);
      const month = MONTHS[m[2].toLowerCase()];
      if (m[3]) return [Number(m[3]), month, day];
      // Bez roku: najbliższy taki dzień, nie wcześniejszy niż dziś.
      const y = today.getFullYear();
      const startOfToday = new Date(y, today.getMonth(), today.getDate());
      return [new Date(y, month - 1, day) < startOfToday ? y + 1 : y, month, day];
    },
  },
];

function mentionAt(body: string, m: RegExpExecArray, date: string): DateMention {
  const after = m.index + m[0].length;
  const time = timeAfter(body.slice(after, after + 40));
  if (!time || !validClock(time.start)) return { start: date, end: null, allDay: true };
  const start = `${date}T${pad(time.start[0])}:${pad(time.start[1])}:00`;
  const end = time.end && validClock(time.end) ? `${date}T${pad(time.end[0])}:${pad(time.end[1])}:00` : null;
  return { start, end: end && end > start ? end : null, allDay: false };
}

/** Pierwszy (najwcześniejszy w tekście) przyszły termin w treści; null, gdy brak. */
export function findDateMention(text: string, now: Date = new Date()): DateMention | null {
  const body = stripQuoted(text);
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  let best: { index: number; mention: DateMention } | null = null;
  for (const { re, parse } of DATE_PATTERNS) {
    re.lastIndex = 0;
    for (let m = re.exec(body); m; m = re.exec(body)) {
      if (best && best.index <= m.index) break;
      const [y, mo, d] = parse(m, now);
      const date = `${y}-${pad(mo)}-${pad(d)}`;
      if (validDate(y, mo, d) && date >= today) best = { index: m.index, mention: mentionAt(body, m, date) };
    }
  }
  return best?.mention ?? null;
}
