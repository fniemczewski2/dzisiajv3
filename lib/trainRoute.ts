// lib/trainRoute.ts
//
// Dopasowanie stacji z biletu do stacji na trasie konkretnego pociągu.
// Szukanie w całym słowniku PLK potrafi trafić w inną stację o podobnej nazwie
// (np. pierwszą „Kraków …” zamiast „Kraków Główny”), dlatego stację docelową
// wybieramy wyłącznie spośród stacji leżących na trasie za stacją wyjazdu.

// \b nie działa z polskimi literami, więc granice słów wyznaczają spacje
// (nazwa jest otoczona spacjami przed podmianą).
const abbr = (short: string) => new RegExp(`(?<=\\s)${short}\\.?(?=\\s)`, "g");

const ABBREVIATIONS: [RegExp, string][] = [
  [abbr("gł"), "główny"],
  [abbr("gl"), "główny"],
  [abbr("centr"), "centralna"],
  [abbr("wsch"), "wschodnia"],
  [abbr("zach"), "zachodnia"],
  [abbr("płd"), "południowa"],
  [abbr("płn"), "północna"],
  [abbr("m"), "miasto"],
];

export function normalizeStationName(name: string): string {
  let s = ` ${name.toLowerCase().replace(/\./g, ". ").replace(/\s+/g, " ").trim()} `;
  for (const [pattern, replacement] of ABBREVIATIONS) s = s.replace(pattern, replacement);
  return s.replace(/\./g, " ").replace(/[-–]/g, " ").replace(/\s+/g, " ").trim();
}

/** 4 – ta sama nazwa, 3 – jedna jest początkiem drugiej, 2 – zawiera, 0 – brak. */
export function stationMatchScore(candidate: string, query: string): number {
  const a = normalizeStationName(candidate);
  const b = normalizeStationName(query);
  if (!a || !b) return 0;
  if (a === b) return 4;
  if (a.startsWith(`${b} `) || b.startsWith(`${a} `)) return 3;
  if (a.includes(b) || b.includes(a)) return 2;
  return 0;
}

export interface RouteResolution {
  fromIndex: number;
  toIndex: number;
  toStationId: string | null;
}

/**
 * Indeksy stacji wyjazdu i przyjazdu na trasie pociągu.
 * `routeIds` – identyfikatory stacji w kolejności przejazdu.
 */
export function resolveRouteStations(
  routeIds: string[],
  nameOf: (id: string) => string | undefined,
  from: { id: string | null; query: string },
  to: { id: string | null; query: string }
): RouteResolution {
  const best = (start: number, query: string, preferredId: string | null) => {
    let bestIndex = -1;
    let bestScore = 0;
    for (let i = start; i < routeIds.length; i++) {
      const id = routeIds[i];
      let score = stationMatchScore(nameOf(id) ?? "", query);
      if (id === preferredId) score = Math.max(score, 3.5);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    return bestIndex;
  };

  let fromIndex = from.id ? routeIds.indexOf(from.id) : -1;
  if (fromIndex < 0) fromIndex = best(0, from.query, null);

  const toIndex = best(fromIndex + 1, to.query, to.id);
  return { fromIndex, toIndex, toStationId: toIndex >= 0 ? routeIds[toIndex] : null };
}
