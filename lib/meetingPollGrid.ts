// lib/meetingPollGrid.ts

export function normalizeTime(time: string): string {
  return time.slice(0, 5);
}

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

export function slotKey(date: string, startTime: string): string {
  return `${date}|${normalizeTime(startTime)}`;
}

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
