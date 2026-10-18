// lib/zjazdyParser.ts
//
// Wyszukuje terminy zjazdów w tekście skopiowanym ze strony uczelni (tabela,
// lista, akapit). Rozpoznaje m.in.:
//   11-12.10.2025 · 11–12.10.2025 r. · 31.10–02.11.2025 · 11.10.2025 – 12.10.2025
//   11 i 12 października 2025 · 11-12 X 2025 · 11.10.2025 (pojedynczy dzień)
// Rok można pominąć – wtedy bierzemy ostatni rok, który pojawił się wcześniej
// w tekście, a jeśli żadnego nie było, rok akademicki: paź–gru → rok
// rozpoczęcia, sty–wrz → następny.

import { MAX_STUDY_SESSION_SPAN_DAYS } from "@/config/limits";
export interface StudyDateRange {
  start: string; // yyyy-MM-dd
  end: string; // yyyy-MM-dd
  raw: string;
}

const MONTHS: Record<string, number> = {
  stycznia: 1,
  styczeń: 1,
  lutego: 2,
  luty: 2,
  marca: 3,
  marzec: 3,
  kwietnia: 4,
  kwiecień: 4,
  maja: 5,
  maj: 5,
  czerwca: 6,
  czerwiec: 6,
  lipca: 7,
  lipiec: 7,
  sierpnia: 8,
  sierpień: 8,
  września: 9,
  wrzesień: 9,
  października: 10,
  październik: 10,
  listopada: 11,
  listopad: 11,
  grudnia: 12,
  grudzień: 12,
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
  xi: 11,
  xii: 12,
};
const MONTH_WORD =
  "(stycznia|styczeń|lutego|luty|marca|marzec|kwietnia|kwiecień|maja|maj|czerwca|czerwiec|lipca|lipiec|sierpnia|sierpień|września|wrzesień|października|październik|listopada|listopad|grudnia|grudzień|xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)";

/** Najdłuższy sensowny zjazd (np. pt–nd z zapasem). */

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

function valid(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function spanDays(a: string, b: string): number {
  return (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000;
}

function academicYear(month: number, now: Date): number {
  const startYear = now.getMonth() + 1 >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return month >= 8 ? startYear : startYear + 1;
}

interface Pattern {
  re: RegExp;
  build: (m: RegExpExecArray, yearFor: (month: number, explicit?: string) => number) => [string, string] | null;
}

const D = String.raw`(\d{1,2})`;
const M = String.raw`(\d{1,2})`;
const Y = String.raw`(\d{4})`;
const DASH = String.raw`\s*[-–—]\s*`;
const DOT = String.raw`\s*[./]\s*`;
const JOIN = String.raw`\s*(?:[-–—]|i|,|oraz)\s*`;
const B = String.raw`\b`;
const SPACE = String.raw`\s+`;

/** Rok pierwszego dnia zakresu „31.10–02.11”: jawny, albo rok wcześniej przy przełomie roku. */
function startYear(explicit: string | undefined, startMonth: number, endMonth: number, endYear: number): number {
  if (explicit) return Number(explicit);
  return startMonth > endMonth ? endYear - 1 : endYear;
}

const PATTERNS: Pattern[] = [
  // 31.10(.2025) – 02.11.2025
  {
    re: new RegExp(`${B}${D}${DOT}${M}(?:${DOT}${Y})?${DASH}${D}${DOT}${M}${DOT}?${Y}?`, "g"),
    build: (m, yearFor) => {
      const y2 = yearFor(Number(m[5]), m[6]);
      const y1 = startYear(m[3], Number(m[2]), Number(m[5]), y2);
      return [iso(y1, Number(m[2]), Number(m[1])), iso(y2, Number(m[5]), Number(m[4]))];
    },
  },
  // 11-12.10(.2025), 11 i 12.10.2025, 11, 12.10.2025
  {
    re: new RegExp(`${B}${D}${JOIN}${D}${DOT}${M}(?:${DOT}${Y})?`, "gi"),
    build: (m, yearFor) => {
      const y = yearFor(Number(m[3]), m[4]);
      return [iso(y, Number(m[3]), Number(m[1])), iso(y, Number(m[3]), Number(m[2]))];
    },
  },
  // 11-12 października 2025, 11 i 12 X 2025
  {
    re: new RegExp(`${B}${D}${JOIN}${D}${SPACE}${MONTH_WORD}${B}(?:${SPACE}${Y})?`, "gi"),
    build: (m, yearFor) => {
      const month = MONTHS[m[3].toLowerCase()];
      const y = yearFor(month, m[4]);
      return [iso(y, month, Number(m[1])), iso(y, month, Number(m[2]))];
    },
  },
  // 11.10.2025 / 11.10
  {
    re: new RegExp(`${B}${D}${DOT}${M}(?:${DOT}${Y})?${B}`, "g"),
    build: (m, yearFor) => {
      const y = yearFor(Number(m[2]), m[3]);
      const day = iso(y, Number(m[2]), Number(m[1]));
      return [day, day];
    },
  },
  // 11 października 2025
  {
    re: new RegExp(`${B}${D}${SPACE}${MONTH_WORD}${B}(?:${SPACE}${Y})?`, "gi"),
    build: (m, yearFor) => {
      const month = MONTHS[m[2].toLowerCase()];
      const y = yearFor(month, m[3]);
      const day = iso(y, month, Number(m[1]));
      return [day, day];
    },
  },
];

interface YearMark {
  at: number;
  year: number;
  academic: boolean;
}

/**
 * Lata podane w tekście – do uzupełniania dat bez roku. „2026/2027” to rok
 * akademicki (paź–gru → 2026, sty–wrz → 2027), pojedynczy rok bierzemy wprost.
 */
function findYearMarks(text: string): YearMark[] {
  const marks: YearMark[] = [];
  for (const ym of text.matchAll(/\b(20\d{2})\s*\/\s*(20\d{2})\b|\b(20\d{2})\b/g)) {
    const academic = Boolean(ym[1]);
    marks.push({ at: ym.index ?? 0, year: Number(academic ? ym[1] : ym[3]), academic });
  }
  return marks;
}

function yearFromMark(mark: YearMark, month: number): number {
  if (!mark.academic) return mark.year;
  return month >= 8 ? mark.year : mark.year + 1;
}

/** Poprawny zakres dni (prawdziwe daty, koniec nie przed początkiem, nie za długi). */
function isValidRange(start: string, end: string, maxSpan = MAX_STUDY_SESSION_SPAN_DAYS): boolean {
  const [ys, ms, ds] = start.split("-").map(Number);
  const [ye, me, de] = end.split("-").map(Number);
  if (!valid(ys, ms, ds) || !valid(ye, me, de)) return false;
  const span = spanDays(start, end);
  return span >= 0 && span <= maxSpan;
}

export interface DateMatch extends StudyDateRange {
  /** Pozycja dopasowania w tekście. */
  index: number;
  length: number;
}

/**
 * Wszystkie daty i zakresy dat w tekście, z pozycją (bez usuwania powtórzeń).
 * `maxSpanDays` – najdłuższy dopuszczalny zakres (zjazdy: 4 dni, ogólnie: miesiąc).
 */
export function findDateMatches(
  text: string,
  now: Date = new Date(),
  maxSpanDays = MAX_STUDY_SESSION_SPAN_DAYS
): DateMatch[] {
  const consumed: Array<[number, number]> = [];
  const found: DateMatch[] = [];
  const overlaps = (a: number, b: number) => consumed.some(([x, y]) => a < y && x < b);
  const marks = findYearMarks(text);

  for (const pattern of PATTERNS) {
    for (const m of text.matchAll(pattern.re)) {
      const from = m.index ?? 0;
      const to = from + m[0].length;
      if (overlaps(from, to)) continue;

      const yearFor = (month: number, explicit?: string) => {
        if (explicit) return Number(explicit);
        const prior = marks.findLast((y) => y.at < from);
        return prior ? yearFromMark(prior, month) : academicYear(month, now);
      };
      const result = pattern.build(m as RegExpExecArray, yearFor);
      if (!result) continue;

      // Odrzucony zapis też „zajmuje” tekst – inaczej zbyt długi zakres
      // rozpadłby się na pojedyncze dni dopasowane przez kolejne wzorce.
      consumed.push([from, to]);
      if (isValidRange(result[0], result[1], maxSpanDays)) {
        found.push({ start: result[0], end: result[1], raw: m[0].trim(), index: from, length: m[0].length });
      }
    }
  }
  return found.toSorted((a, b) => a.index - b.index);
}

export function parseStudyDates(text: string, now: Date = new Date()): StudyDateRange[] {
  const found = findDateMatches(text, now);
  const unique = new Map<string, StudyDateRange>();
  for (const f of found.toSorted((a, b) => a.start.localeCompare(b.start))) {
    const key = `${f.start}|${f.end}`;
    if (!unique.has(key)) unique.set(key, { start: f.start, end: f.end, raw: f.raw });
  }
  return [...unique.values()];
}
