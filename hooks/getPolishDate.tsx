export function getPolishDate(): Date {
  const now = new Date();

  // Formatowanie do ISO w strefie Europe/Warsaw
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // np. "2025-10-31 00:50:00"
  const formatted = formatter.format(now).replace(" ", "T");

  // Tworzymy obiekt Date z tego stringa (traktowany jako lokalny czas)
  return new Date(formatted);
}

export function getPolishDateString(): string {
  const now = new Date();

  // Formatowanie do YYYY-MM-DD w strefie Europe/Warsaw
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(now); // np. "2025-10-31"
}
