// lib/meetingPollGrid.ts
//
// Czyste funkcje wspólne dla klienta (rysowanie siatki godzin w formularzu
// uczestnika i w wynikach organizatora) i serwera (walidacja przesłanych
// slotów w pages/api/meeting-polls/public/[token]/respond.ts — nigdy nie
// ufamy samym slotom przysłanym przez klienta, muszą mieścić się w
// dozwolonej siatce ankiety).

/** Postgres `time` bywa zwracane jako "HH:MM:SS" — normalizujemy do "HH:MM". */
export function normalizeTime(time: string): string {
  return time.slice(0, 5);
}

/** Lista sloty startowe "HH:MM" pomiędzy timeStart (włącznie) a timeEnd
 * (wyłącznie) co durationMinutes. */
export function generateTimeSlots(timeStart: string, timeEnd: string, durationMinutes: number): string[] {
  const [startH, startM] = normalizeTime(timeStart).split(":").map(Number);
  const [endH, endM] = normalizeTime(timeEnd).split(":").map(Number);
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;

  const slots: string[] = [];
  for (let t = startTotal; t < endTotal; t += durationMinutes) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return slots;
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = normalizeTime(time).split(":").map(Number);
  const total = ((h * 60 + m + minutes) % 1440 + 1440) % 1440;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

/** Klucz do Set/Map identyfikujący pojedynczy slot (data + godzina startu). */
export function slotKey(date: string, startTime: string): string {
  return `${date}|${normalizeTime(startTime)}`;
}

/** Zbiór wszystkich DOZWOLONYCH slotów dla danej ankiety — używane przez
 * API route do odrzucenia slotów spoza siatki (klient mógłby przysłać
 * dowolne wartości, niekoniecznie zgodne z tym, co faktycznie renderuje
 * formularz). */
export function buildAllowedSlotSet(
  dates: string[],
  timeStart: string,
  timeEnd: string,
  durationMinutes: number
): Set<string> {
  const times = generateTimeSlots(timeStart, timeEnd, durationMinutes);
  const set = new Set<string>();
  for (const d of dates) {
    for (const t of times) set.add(slotKey(d, t));
  }
  return set;
}
