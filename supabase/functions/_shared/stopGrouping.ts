// supabase/functions/_shared/stopGrouping.ts
//
// Czysta logika (bez API Deno), współdzielona przez edge function
// `transport-departures` i frontend (hooks/db/useTransport.ts).
//
// Problem, który rozwiązuje: w sieci PEKA/ZTM Poznań przystanki w różnych
// miejscowościach potrafią mieć identyczną nazwę (np. Poznań i Luboń).
// Grupowanie po samej nazwie łączyło je w jeden "przystanek". Teraz grupa
// (StopCluster) to słupki o tej samej nazwie, w tej samej sieci, leżące
// blisko siebie – odległe słupki o tej samej nazwie są osobnymi grupami.

export type TransportNetwork = "poznan" | "szczecin";

export interface StopPost {
  stop_code: string | null;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  zone_id: string | null;
}

export interface StopCluster {
  /** Stabilny w obrębie jednej odpowiedzi identyfikator grupy. */
  key: string;
  name: string;
  network: TransportNetwork;
  zone_id: string;
  stop_codes: string[];
  lat: number;
  lon: number;
}

/** Ulubiony przystanek zapisany w settings.favorite_stops. */
export interface FavoriteStop {
  name: string;
  zone_id: string;
  /** Środek grupy – rozróżnia przystanki o tej samej nazwie. Brak w starych wpisach. */
  lat?: number;
  lon?: number;
  /** Kody słupków w chwili dodania (informacyjnie / diagnostyka). */
  stop_codes?: string[];
  /** Miejscowość, jeśli nazwa jest niejednoznaczna (np. "Luboń"). */
  locality?: string;
}

/** Słupki tego samego przystanku leżą zwykle w promieniu ~200–300 m (duże węzły do ~500 m). */
export const CLUSTER_RADIUS_M = 600;

const SZCZECIN_ZONE = "S";

export function networkOf(zoneId: string | null | undefined): TransportNetwork {
  return zoneId === SZCZECIN_ZONE ? "szczecin" : "poznan";
}

export function normalizeStopName(name: string): string {
  return (name ?? "").normalize("NFC").trim().replaceAll(/\s+/g, " ").toLocaleLowerCase("pl");
}

export function distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = "AUTO";
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) { best = v; bestCount = c; }
  }
  return best;
}

/**
 * Dzieli słupki na grupy: ta sama sieć + ta sama nazwa (bez wielkości liter)
 * + łańcuch słupków, w którym każdy leży w promieniu `radiusM` od innego
 * (single-linkage). Słupki bez kodu są pomijane – nie da się dla nich pobrać odjazdów.
 */
function isUsablePost(p: StopPost): boolean {
  return Boolean(p.stop_code && p.stop_name) && Number.isFinite(p.stop_lat) && Number.isFinite(p.stop_lon);
}

/** Słupki pogrupowane po sieci i znormalizowanej nazwie. */
function groupByNetworkAndName(posts: readonly StopPost[]): Map<string, StopPost[]> {
  const byName = new Map<string, StopPost[]>();
  for (const p of posts) {
    if (!isUsablePost(p)) continue;
    const key = `${networkOf(p.zone_id)}|${normalizeStopName(p.stop_name)}`;
    const list = byName.get(key);
    if (list) list.push(p);
    else byName.set(key, [p]);
  }
  return byName;
}

/** Oznacza numerem `cluster` wszystkie słupki osiągalne od `seed` krokami ≤ radiusM. */
function floodFill(unique: readonly StopPost[], assigned: number[], seed: number, cluster: number, radiusM: number): void {
  assigned[seed] = cluster;
  const queue = [seed];
  while (queue.length) {
    const cur = unique[queue.pop() as number];
    for (let j = 0; j < unique.length; j++) {
      if (assigned[j] !== -1) continue;
      if (distanceM(cur.stop_lat, cur.stop_lon, unique[j].stop_lat, unique[j].stop_lon) <= radiusM) {
        assigned[j] = cluster;
        queue.push(j);
      }
    }
  }
}

/** Dzieli słupki o tej samej nazwie na skupiska położone blisko siebie. */
function splitByDistance(unique: readonly StopPost[], radiusM: number): StopPost[][] {
  const assigned = new Array<number>(unique.length).fill(-1);
  let count = 0;
  for (let i = 0; i < unique.length; i++) {
    if (assigned[i] === -1) floodFill(unique, assigned, i, count++, radiusM);
  }
  return Array.from({ length: count }, (_, c) => unique.filter((_, i) => assigned[i] === c));
}

function toCluster(members: readonly StopPost[]): StopCluster {
  const codes = members.map((m) => m.stop_code as string).sort((a, b) => a.localeCompare(b));
  const lat = members.reduce((s, m) => s + m.stop_lat, 0) / members.length;
  const lon = members.reduce((s, m) => s + m.stop_lon, 0) / members.length;
  const network = networkOf(members[0].zone_id);
  return {
    key: `${network}:${codes[0]}`,
    name: members[0].stop_name.trim(),
    network,
    zone_id: mostCommon(members.map((m) => m.zone_id ?? "AUTO")),
    stop_codes: codes,
    lat: Math.round(lat * 1e6) / 1e6,
    lon: Math.round(lon * 1e6) / 1e6,
  };
}

export function clusterStops(posts: readonly StopPost[], radiusM = CLUSTER_RADIUS_M): StopCluster[] {
  const clusters: StopCluster[] = [];
  for (const group of groupByNetworkAndName(posts).values()) {
    // Deduplikacja po kodzie (to samo zapytanie może zwrócić słupek dwa razy).
    const unique = Array.from(new Map(group.map((p) => [p.stop_code as string, p])).values());
    for (const members of splitByDistance(unique, radiusM)) clusters.push(toCluster(members));
  }
  return clusters;
}

/** Nazwy, które w tym zbiorze występują w więcej niż jednej grupie (np. Poznań i Luboń). */
export function ambiguousNames(clusters: readonly StopCluster[]): Set<string> {
  const counts = new Map<string, number>();
  for (const c of clusters) {
    const k = `${c.network}|${normalizeStopName(c.name)}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const out = new Set<string>();
  for (const [k, n] of counts) if (n > 1) out.add(k);
  return out;
}

export function isAmbiguous(cluster: StopCluster, ambiguous: Set<string>): boolean {
  return ambiguous.has(`${cluster.network}|${normalizeStopName(cluster.name)}`);
}

/**
 * Wybiera grupę odpowiadającą ulubionemu. Z zapisanym położeniem – najbliższą
 * temu punktowi. Stary wpis (tylko nazwa) – jedyną, a przy wielu: najbliższą
 * użytkownikowi, a bez GPS największą (najwięcej słupków).
 */
export function pickClusterForFavorite(
  fav: FavoriteStop,
  candidates: readonly StopCluster[],
  userPos?: { lat: number; lon: number } | null
): StopCluster | null {
  const name = normalizeStopName(fav.name);
  const network = networkOf(fav.zone_id);
  const matching = candidates.filter(
    (c) => normalizeStopName(c.name) === name && (fav.zone_id === "AUTO" || c.network === network)
  );
  if (matching.length === 0) return null;
  if (matching.length === 1) return matching[0];

  const ref = hasPosition(fav) ? { lat: fav.lat, lon: fav.lon } : userPos ?? null;
  if (ref) {
    return [...matching].sort((a, b) => distanceM(ref.lat, ref.lon, a.lat, a.lon) - distanceM(ref.lat, ref.lon, b.lat, b.lon))[0];
  }
  return [...matching].sort((a, b) => b.stop_codes.length - a.stop_codes.length)[0];
}

export function hasPosition(fav: FavoriteStop): fav is FavoriteStop & { lat: number; lon: number } {
  return typeof fav.lat === "number" && typeof fav.lon === "number" && Number.isFinite(fav.lat) && Number.isFinite(fav.lon);
}

/** Czy dwa wpisy wskazują to samo miejsce (ta sama nazwa i sieć, położenie w promieniu grupy). */
export function isSameStopPlace(a: FavoriteStop, b: FavoriteStop): boolean {
  if (normalizeStopName(a.name) !== normalizeStopName(b.name)) return false;
  if (a.zone_id !== "AUTO" && b.zone_id !== "AUTO" && networkOf(a.zone_id) !== networkOf(b.zone_id)) return false;
  if (hasPosition(a) && hasPosition(b)) return distanceM(a.lat, a.lon, b.lat, b.lon) <= CLUSTER_RADIUS_M;
  // Bez położenia po którejś stronie nie da się rozróżnić – traktujemy jak to samo tylko,
  // gdy oba są stare (wtedy zachowanie jak dotychczas).
  return !hasPosition(a) && !hasPosition(b);
}

/** Klucz ulubionego – do Reacta i usuwania (zamiast samej nazwy). */
export function favoriteKey(fav: FavoriteStop): string {
  const base = `${networkOf(fav.zone_id)}:${normalizeStopName(fav.name)}`;
  return hasPosition(fav) ? `${base}@${fav.lat.toFixed(4)},${fav.lon.toFixed(4)}` : base;
}

export function favoriteFromCluster(cluster: StopCluster, locality?: string | null): FavoriteStop {
  return {
    name: cluster.name,
    zone_id: cluster.zone_id,
    lat: cluster.lat,
    lon: cluster.lon,
    stop_codes: cluster.stop_codes,
    ...(locality ? { locality } : {}),
  };
}
