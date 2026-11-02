// lib/health/format.ts

const STEPS_FORMAT = new Intl.NumberFormat("pl-PL");

export function formatSteps(steps: number): string {
  return STEPS_FORMAT.format(steps);
}

/** 431 → „7 h 11 min”; 45 → „45 min”. */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
