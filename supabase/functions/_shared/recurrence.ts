// supabase/functions/_shared/recurrence.ts

export type RecurrenceFreq = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurrenceRule {
  freq: RecurrenceFreq;
  /** Co ile jednostek (1 = każdy dzień/tydzień/…). */
  interval: number;
  /** Tylko weekly: dni tygodnia, 0 = poniedziałek … 6 = niedziela. Puste = dzień startu. */
  byWeekday?: number[];
  /** Tylko monthly: „monthday” (np. 15.) albo „nth_weekday” (np. 2. wtorek). */
  monthlyBy?: "monthday" | "nth_weekday";
  /** Tylko monthly + nth_weekday: 1–4 albo -1 (ostatni). Domyślnie wynika z daty startu. */
  nth?: number;
  /** Ostatni możliwy dzień (yyyy-MM-dd, włącznie). */
  until?: string | null;
  /** Liczba wszystkich wystąpień licząc od startu. */
  count?: number | null;
}

export const MAX_INTERVAL = 99;
export const MAX_COUNT = 500;
/** Bezpiecznik pętli – żadna reguła nie przejdzie więcej kroków. */
const MAX_STEPS = 20_000;

const DAY_MS = 86_400_000;

export function parseDay(day: string): number {
  const [y, m, d] = day.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function formatDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** 0 = poniedziałek … 6 = niedziela. */
export function weekdayOf(ms: number): number {
  return (new Date(ms).getUTCDay() + 6) % 7;
}

function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

/** N-ty (1–4) albo ostatni (-1) dzień tygodnia `weekday` w miesiącu; null, gdy nie istnieje. */
function nthWeekdayOfMonth(year: number, month0: number, weekday: number, nth: number): number | null {
  if (nth === -1) {
    const last = Date.UTC(year, month0, daysInMonth(year, month0));
    const diff = (weekdayOf(last) - weekday + 7) % 7;
    return last - diff * DAY_MS;
  }
  const first = Date.UTC(year, month0, 1);
  const diff = (weekday - weekdayOf(first) + 7) % 7;
  const day = 1 + diff + (nth - 1) * 7;
  return day > daysInMonth(year, month0) ? null : Date.UTC(year, month0, day);
}

/** Który to wystąpienie dnia tygodnia w miesiącu (1–5) i czy ostatnie. */
export function weekdayPosition(day: string): { nth: number; isLast: boolean; weekday: number } {
  const ms = parseDay(day);
  const d = new Date(ms);
  const date = d.getUTCDate();
  return {
    nth: Math.ceil(date / 7),
    isLast: date + 7 > daysInMonth(d.getUTCFullYear(), d.getUTCMonth()),
    weekday: weekdayOf(ms),
  };
}

export function normalizeRule(raw: unknown): RecurrenceRule | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<RecurrenceRule>;
  if (!r.freq || !["daily", "weekly", "monthly", "yearly"].includes(r.freq)) return null;
  const interval = Math.min(MAX_INTERVAL, Math.max(1, Math.floor(Number(r.interval) || 1)));
  const rule: RecurrenceRule = { freq: r.freq, interval };
  if (r.freq === "weekly" && Array.isArray(r.byWeekday)) {
    const days = [...new Set(r.byWeekday.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
    if (days.length > 0) rule.byWeekday = days;
  }
  if (r.freq === "monthly") {
    rule.monthlyBy = r.monthlyBy === "nth_weekday" ? "nth_weekday" : "monthday";
    if (rule.monthlyBy === "nth_weekday" && (r.nth === -1 || (Number(r.nth) >= 1 && Number(r.nth) <= 4))) {
      rule.nth = Number(r.nth);
    }
  }
  if (typeof r.until === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.until)) rule.until = r.until;
  if (r.count !== null && r.count !== undefined && Number(r.count) >= 1) {
    rule.count = Math.min(MAX_COUNT, Math.floor(Number(r.count)));
  }
  return rule;
}

/** Stare pole `repeat` wydarzeń (none/weekly/monthly/yearly) jako reguła. */
export function ruleFromLegacyRepeat(repeat: string | null | undefined): RecurrenceRule | null {
  if (repeat === "daily") return { freq: "daily", interval: 1 };
  if (repeat === "weekly") return { freq: "weekly", interval: 1 };
  if (repeat === "monthly") return { freq: "monthly", interval: 1, monthlyBy: "monthday" };
  if (repeat === "yearly") return { freq: "yearly", interval: 1 };
  return null;
}

/** Wartość zgodna ze starym polem `repeat` (dla eksportu i starszego kodu). */
export function legacyRepeatFor(rule: RecurrenceRule | null): "none" | "daily" | "weekly" | "monthly" | "yearly" {
  return rule ? rule.freq : "none";
}

/**
 * Kolejne dni wystąpień (yyyy-MM-dd) od `start`, w kolejności, aż do
 * `rangeEnd` (włącznie). Pierwsze wystąpienie to zawsze `start`, nawet jeśli
 * nie pasuje do reguły (tak działa Google/Outlook przy ręcznie ustawionej dacie).
 */
export function* iterateOccurrences(start: string, rule: RecurrenceRule, rangeEnd: string): Generator<string> {
  const startMs = parseDay(start);
  const endMs = Math.min(parseDay(rangeEnd), rule.until ? parseDay(rule.until) : Infinity);
  const maxCount = rule.count ?? Infinity;
  if (startMs > endMs) return;

  let emitted = 0;
  const emit = function* (ms: number): Generator<string> {
    if (ms < startMs || ms > endMs || emitted >= maxCount) return;
    emitted++;
    yield formatDay(ms);
  };

  const d0 = new Date(startMs);
  const y0 = d0.getUTCFullYear();
  const m0 = d0.getUTCMonth();
  const day0 = d0.getUTCDate();

  for (let step = 0; step < MAX_STEPS && emitted < maxCount; step++) {
    let candidates: number[] = [];
    switch (rule.freq) {
      case "daily":
        candidates = [startMs + step * rule.interval * DAY_MS];
        break;
      case "weekly": {
        const weekStart = startMs - weekdayOf(startMs) * DAY_MS + step * rule.interval * 7 * DAY_MS;
        const days = rule.byWeekday?.length ? rule.byWeekday : [weekdayOf(startMs)];
        candidates = days.map((wd) => weekStart + wd * DAY_MS);
        break;
      }
      case "monthly": {
        const totalMonth = m0 + step * rule.interval;
        const year = y0 + Math.floor(totalMonth / 12);
        const month0 = ((totalMonth % 12) + 12) % 12;
        if (rule.monthlyBy === "nth_weekday") {
          const pos = weekdayPosition(start);
          const nth = rule.nth ?? (pos.nth > 4 ? -1 : pos.nth);
          const ms = nthWeekdayOfMonth(year, month0, pos.weekday, nth);
          if (ms !== null) candidates = [ms];
        } else if (day0 <= daysInMonth(year, month0)) {
          // 31. dnia – miesiące bez 31. pomijamy (jak w Kalendarzu Google).
          candidates = [Date.UTC(year, month0, day0)];
        }
        break;
      }
      case "yearly": {
        const year = y0 + step * rule.interval;
        if (day0 <= daysInMonth(year, m0)) candidates = [Date.UTC(year, m0, day0)];
        break;
      }
    }

    if (step === 0 && !candidates.includes(startMs)) candidates.unshift(startMs);
    candidates.sort((a, b) => a - b);

    // Jeśli najwcześniejszy kandydat tego kroku jest już za końcem – koniec.
    if (candidates.length > 0 && candidates[0] > endMs) return;
    for (const ms of candidates) yield* emit(ms);
  }
}

/** Wystąpienia, które zaczynają się w [from, to] (oba włącznie). */
export function occurrencesBetween(start: string, rule: RecurrenceRule, from: string, to: string): string[] {
  const result: string[] = [];
  const fromMs = parseDay(from);
  for (const day of iterateOccurrences(start, rule, to)) {
    if (parseDay(day) >= fromMs) result.push(day);
  }
  return result;
}

/** Pierwsze wystąpienie ściśle po dniu `after`; null, gdy reguła się skończyła. */
export function nextOccurrenceAfter(start: string, rule: RecurrenceRule, after: string): string | null {
  const afterMs = parseDay(after);
  // Szukamy w oknie do 400 interwałów naprzód – wystarczy dla każdej sensownej reguły.
  const horizonDays = { daily: 1, weekly: 7, monthly: 31, yearly: 366 }[rule.freq] * rule.interval * 400;
  const horizon = formatDay(Math.max(afterMs, parseDay(start)) + horizonDays * DAY_MS);
  for (const day of iterateOccurrences(start, rule, horizon)) {
    if (parseDay(day) > afterMs) return day;
  }
  return null;
}

const WEEKDAY_SHORT = ["pn", "wt", "śr", "cz", "pt", "sb", "nd"];
const WEEKDAY_ACC = ["poniedziałek", "wtorek", "środę", "czwartek", "piątek", "sobotę", "niedzielę"];
const NTH_LABEL: Record<string, string> = { "1": "1.", "2": "2.", "3": "3.", "4": "4.", "-1": "ostatni" };

function unit(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const last = n % 10;
  const lastTwo = n % 100;
  return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many;
}

/** Opis po polsku, np. „Co 2 tygodnie: pn, śr, do 20.12.2026”. */
export function describeRule(rule: RecurrenceRule | null, start?: string): string {
  if (!rule) return "Nie powtarza się";
  const n = rule.interval;
  let text: string;
  switch (rule.freq) {
    case "daily":
      text = n === 1 ? "Codziennie" : `Co ${n} ${unit(n, "dzień", "dni", "dni")}`;
      break;
    case "weekly": {
      const days = rule.byWeekday?.length
        ? rule.byWeekday
        : start ? [weekdayOf(parseDay(start))] : [];
      const base = n === 1 ? "Co tydzień" : `Co ${n} ${unit(n, "tydzień", "tygodnie", "tygodni")}`;
      const isWorkdays = days.length === 5 && days.every((d, i) => d === i);
      text = days.length ? `${base}: ${isWorkdays ? "w dni robocze" : days.map((d) => WEEKDAY_SHORT[d]).join(", ")}` : base;
      break;
    }
    case "monthly": {
      const base = n === 1 ? "Co miesiąc" : `Co ${n} ${unit(n, "miesiąc", "miesiące", "miesięcy")}`;
      if (start && rule.monthlyBy === "nth_weekday") {
        const pos = weekdayPosition(start);
        const nth = rule.nth ?? (pos.nth > 4 ? -1 : pos.nth);
        text = `${base}, w ${NTH_LABEL[String(nth)]} ${WEEKDAY_ACC[pos.weekday]}`;
      } else if (start) {
        text = `${base}, ${Number(start.slice(8, 10))}. dnia`;
      } else {
        text = base;
      }
      break;
    }
    case "yearly":
      text = n === 1 ? "Co roku" : `Co ${n} ${unit(n, "rok", "lata", "lat")}`;
      break;
  }
  if (rule.until) text += `, do ${rule.until.split("-").reverse().join(".")}`;
  else if (rule.count) text += `, ${rule.count} ${unit(rule.count, "raz", "razy", "razy")}`;
  return text;
}
