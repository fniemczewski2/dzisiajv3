// lib/zjazdyParser.ts
//
// Wyszukuje terminy zjazdów w tekście skopiowanym ze strony uczelni (tabela,
// lista, akapit). Rozpoznaje m.in.:
//   11-12.10.2025 · 11–12.10.2025 r. · 31.10–02.11.2025 · 11.10.2025 – 12.10.2025
//   11 i 12 października 2025 · 11-12 X 2025 · 11.10.2025 (pojedynczy dzień)
// Rok można pominąć – wtedy bierzemy ostatni rok, który pojawił się wcześniej
// w tekście, a jeśli żadnego nie było, rok akademicki: paź–gru → rok
// rozpoczęcia, sty–wrz → następny.

export interface StudyDateRange {
  start: string; // yyyy-MM-dd
  end: string;   // yyyy-MM-dd
  raw: string;
}

const MONTHS: Record<string, number> = {
  stycznia: 1, styczeń: 1, lutego: 2, luty: 2, marca: 3, marzec: 3, kwietnia: 4, kwiecień: 4,
  maja: 5, maj: 5, czerwca: 6, czerwiec: 6, lipca: 7, lipiec: 7, sierpnia: 8, sierpień: 8,
  września: 9, wrzesień: 9, października: 10, październik: 10, listopada: 11, listopad: 11,
  grudnia: 12, grudzień: 12,
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12,
};
const MONTH_WORD = "(stycznia|styczeń|lutego|luty|marca|marzec|kwietnia|kwiecień|maja|maj|czerwca|czerwiec|lipca|lipiec|sierpnia|sierpień|września|wrzesień|października|październik|listopada|listopad|grudnia|grudzień|xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)";

/** Najdłuższy sensowny zjazd (np. pt–nd z zapasem). */
const MAX_SPAN_DAYS = 4;

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

const D = "(\\d{1,2})";
const M = "(\\d{1,2})";
const Y = "(\\d{4})";
const DASH = "\\s*[-–—]\\s*";
const DOT = "\\s*[./]\\s*";

const PATTERNS: Pattern[] = [
  // 31.10(.2025) – 02.11.2025
  {
    re: new RegExp(`\\b${D}${DOT}${M}(?:${DOT}${Y})?${DASH}${D}${DOT}${M}${DOT}?${Y}?`, "g"),
    build: (m, yearFor) => {
      const y2 = yearFor(Number(m[5]), m[6]);
      const y1 = m[3] ? Number(m[3]) : Number(m[2]) > Number(m[5]) ? y2 - 1 : y2;
      return [iso(y1, Number(m[2]), Number(m[1])), iso(y2, Number(m[5]), Number(m[4]))];
    },
  },
  // 11-12.10(.2025), 11 i 12.10.2025, 11, 12.10.2025
  {
    re: new RegExp(`\\b${D}\\s*(?:[-–—]|i|,|oraz)\\s*${D}${DOT}${M}(?:${DOT}${Y})?`, "gi"),
    build: (m, yearFor) => {
      const y = yearFor(Number(m[3]), m[4]);
      return [iso(y, Number(m[3]), Number(m[1])), iso(y, Number(m[3]), Number(m[2]))];
    },
  },
  // 11-12 października 2025, 11 i 12 X 2025
  {
    re: new RegExp(`\\b${D}\\s*(?:[-–—]|i|,|oraz)\\s*${D}\\s+${MONTH_WORD}\\b(?:\\s+${Y})?`, "gi"),
    build: (m, yearFor) => {
      const month = MONTHS[m[3].toLowerCase()];
      const y = yearFor(month, m[4]);
      return [iso(y, month, Number(m[1])), iso(y, month, Number(m[2]))];
    },
  },
  // 11.10.2025 / 11.10
  {
    re: new RegExp(`\\b${D}${DOT}${M}(?:${DOT}${Y})?\\b`, "g"),
    build: (m, yearFor) => {
      const y = yearFor(Number(m[2]), m[3]);
      const day = iso(y, Number(m[2]), Number(m[1]));
      return [day, day];
    },
  },
  // 11 października 2025
  {
    re: new RegExp(`\\b${D}\\s+${MONTH_WORD}\\b(?:\\s+${Y})?`, "gi"),
    build: (m, yearFor) => {
      const month = MONTHS[m[2].toLowerCase()];
      const y = yearFor(month, m[3]);
      const day = iso(y, month, Number(m[1]));
      return [day, day];
    },
  },
];

export function parseStudyDates(text: string, now: Date = new Date()): StudyDateRange[] {
  const consumed: Array<[number, number]> = [];
  const found: Array<StudyDateRange & { index: number }> = [];
  const overlaps = (a: number, b: number) => consumed.some(([x, y]) => a < y && x < b);

  // Lata podane w tekście – do uzupełniania dat bez roku. „2026/2027” to rok
  // akademicki (paź–gru → 2026, sty–wrz → 2027), pojedynczy rok bierzemy wprost.
  const yearsAt: Array<{ at: number; year: number; academic: boolean }> = [];
  for (const ym of text.matchAll(/\b(20\d{2})\s*\/\s*(20\d{2})\b|\b(20\d{2})\b/g)) {
    if (ym[1]) yearsAt.push({ at: ym.index ?? 0, year: Number(ym[1]), academic: true });
    else yearsAt.push({ at: ym.index ?? 0, year: Number(ym[3]), academic: false });
  }

  for (const pattern of PATTERNS) {
    pattern.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.re.exec(text)) !== null) {
      const from = m.index;
      const to = from + m[0].length;
      if (overlaps(from, to)) continue;
      const yearFor = (month: number, explicit?: string) => {
        if (explicit) return Number(explicit);
        const prior = yearsAt.filter((y) => y.at < from).at(-1);
        if (!prior) return academicYear(month, now);
        return prior.academic ? (month >= 8 ? prior.year : prior.year + 1) : prior.year;
      };
      const result = pattern.build(m, yearFor);
      if (!result) continue;
      const [start, end] = result;
      const [ys, ms, ds] = start.split("-").map(Number);
      const [ye, me, de] = end.split("-").map(Number);
      // Odrzucony zapis też „zajmuje” tekst – inaczej zbyt długi zakres
      // rozpadłby się na pojedyncze dni dopasowane przez kolejne wzorce.
      consumed.push([from, to]);
      if (!valid(ys, ms, ds) || !valid(ye, me, de)) continue;
      const span = spanDays(start, end);
      if (span < 0 || span > MAX_SPAN_DAYS) continue;
      found.push({ start, end, raw: m[0].trim(), index: from });
    }
  }

  const unique = new Map<string, StudyDateRange>();
  for (const f of found.sort((a, b) => a.start.localeCompare(b.start))) {
    const key = `${f.start}|${f.end}`;
    if (!unique.has(key)) unique.set(key, { start: f.start, end: f.end, raw: f.raw });
  }
  return [...unique.values()];
}
