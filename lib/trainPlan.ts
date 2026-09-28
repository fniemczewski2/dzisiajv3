// lib/trainPlan.ts
//
// Obliczenia czasu dla biletów w planie dnia. Czyste funkcje – bez Reacta i sieci.

export interface TrainTimeInput {
  date: string;          // "YYYY-MM-DD"
  departureTime: string; // "HH:MM" (albo "HH:MM:SS")
}

/** Planowy odjazd jako Date w czasie lokalnym urządzenia (aplikacja działa w strefie PL). */
export function plannedDeparture(t: TrainTimeInput): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t.date);
  const h = /^(\d{1,2}):(\d{2})/.exec(t.departureTime ?? "");
  if (!d || !h) return null;
  const date = new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(h[1]), Number(h[2]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatHm(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Klucz godziny planu ("HH:00") dla planowego odjazdu. */
export function planHourKey(t: TrainTimeInput): string | null {
  const m = /^(\d{1,2}):/.exec(t.departureTime ?? "");
  if (!m) return null;
  const h = Number(m[1]);
  return h >= 0 && h <= 23 ? `${String(h).padStart(2, "0")}:00` : null;
}

/** Rzeczywisty odjazd = planowy + opóźnienie. */
export function expectedDeparture(t: TrainTimeInput, delayMinutes: number): Date | null {
  const planned = plannedDeparture(t);
  if (!planned) return null;
  return new Date(planned.getTime() + Math.max(0, delayMinutes) * 60_000);
}

/**
 * Czy warto odpytywać PKP o status na żywo: od 3 h przed odjazdem do 12 h po
 * nim (pociąg może być w trasie). Poza tym oknem dane i tak są statyczne.
 */
export function isStatusRelevant(t: TrainTimeInput, now: Date = new Date()): boolean {
  const planned = plannedDeparture(t);
  if (!planned) return false;
  const diff = planned.getTime() - now.getTime();
  return diff <= 3 * 3600_000 && diff >= -12 * 3600_000;
}

/** "za 25 min", "za 2 h 5 min", "odjechał" – względem oczekiwanego odjazdu. */
export function relativeDeparture(expected: Date, now: Date = new Date()): string {
  const minutes = Math.round((expected.getTime() - now.getTime()) / 60_000);
  if (minutes < 0) return "odjechał";
  if (minutes === 0) return "teraz";
  if (minutes < 60) return `za ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `za ${h} h ${m} min` : `za ${h} h`;
}

/** Pusty/placeholder z API ("-", "...") traktujemy jak brak danych. */
export function cleanValue(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return !t || t === "-" || t === "..." ? null : t;
}
