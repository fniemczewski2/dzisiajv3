// lib/mail/dateMentions.ts
//
// Wykrywanie terminu w treści wiadomości (gdy nie ma pliku .ics) – podstawa podpowiedzi „Dodaj wydarzenie”.
// Formaty: 27.10.2026, 27-10-2026, 2026-10-27, „27 października 2026”, „27 października” (najbliższy przyszły),
// z opcjonalną godziną („o 10:00”, „godz. 10.00”) i końcem („10:00–11:30”).
// Pomijane: cytowana historia odpowiedzi i daty przeszłe. Czas jest czasem polskim (bez strefy).

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

/** Początek cytowanej historii – daty poniżej dotyczą wcześniejszych wiadomości. */
const QUOTE_MARKERS = [
  /^>/m,
  /^-{2,}\s*(original message|wiadomość oryginalna|forwarded message|wiadomość przekazana)/im,
  /^\s*(w dniu|on) .{0,120}(napisał|napisała|wrote)\s*\(?a?\)?:/im,
  /^(od|from):\s/im,
];

export interface DateMention {
  /** „YYYY-MM-DD” (cały dzień) albo „YYYY-MM-DDTHH:MM:00” (czas polski). */
  start: string;
  end: string | null;
  allDay: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

function stripQuoted(text: string): string {
  let cut = text.length;
  for (const re of QUOTE_MARKERS) {
    const m = re.exec(text);
    if (m && m.index < cut) cut = m.index;
  }
  return text.slice(0, cut);
}

function validDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

const TIME_AFTER =
  /^[\s,]*(?:r\.\s*)?(?:,\s*)?(?:o\s+|godz\.?\s*|godzina\s+|w\s+godz\.?\s*)?(\d{1,2})[:.](\d{2})(?:\s*[-–—]\s*(\d{1,2})[:.](\d{2}))?/i;

const DATE_PATTERNS: { re: RegExp; parse: (m: RegExpExecArray, today: Date) => [number, number, number] | null }[] = [
  { re: /\b(\d{4})-(\d{2})-(\d{2})\b/g, parse: (m) => [Number(m[1]), Number(m[2]), Number(m[3])] },
  { re: /\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})\b/g, parse: (m) => [Number(m[3]), Number(m[2]), Number(m[1])] },
  {
    re: /\b(\d{1,2})\s+(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia)(?:\s+(\d{4}))?/gi,
    parse: (m, today) => {
      const day = Number(m[1]);
      const month = MONTHS[m[2].toLowerCase()];
      if (m[3]) return [Number(m[3]), month, day];
      // Bez roku: najbliższy taki dzień, nie wcześniejszy niż dziś.
      const y = today.getFullYear();
      const thisYear = new Date(y, month - 1, day);
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return [thisYear < startOfToday ? y + 1 : y, month, day];
    },
  },
];

/** Pierwszy (najwcześniejszy w tekście) przyszły termin w treści; null, gdy brak. */
export function findDateMention(text: string, now: Date = new Date()): DateMention | null {
  const body = stripQuoted(text);
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  let best: { index: number; mention: DateMention } | null = null;

  for (const { re, parse } of DATE_PATTERNS) {
    re.lastIndex = 0;
    for (let m = re.exec(body); m; m = re.exec(body)) {
      const parsed = parse(m, now);
      if (!parsed || !validDate(...parsed)) continue;
      const [y, mo, d] = parsed;
      const date = `${y}-${pad(mo)}-${pad(d)}`;
      if (date < today) continue;
      if (best && best.index <= m.index) continue;

      const time = TIME_AFTER.exec(body.slice(m.index + m[0].length, m.index + m[0].length + 40));
      let mention: DateMention = { start: date, end: null, allDay: true };
      if (time && Number(time[1]) < 24 && Number(time[2]) < 60) {
        const start = `${date}T${pad(Number(time[1]))}:${time[2]}:00`;
        const end =
          time[3] && Number(time[3]) < 24 && Number(time[4]) < 60
            ? `${date}T${pad(Number(time[3]))}:${time[4]}:00`
            : null;
        mention = { start, end: end && end > start ? end : null, allDay: false };
      }
      best = { index: m.index, mention };
    }
  }
  return best?.mention ?? null;
}
