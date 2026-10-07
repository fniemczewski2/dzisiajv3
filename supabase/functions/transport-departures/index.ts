// supabase/functions/transport-departures/index.ts

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  ambiguousNames,
  clusterStops,
  distanceM,
  favoriteKey,
  favoriteFromCluster,
  hasPosition,
  isAmbiguous,
  pickClusterForFavorite,
  type FavoriteStop,
  type StopCluster,
  type StopPost,
} from "../_shared/stopGrouping.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

const PEKA_URL = "https://www.peka.poznan.pl/vm/method.vm";
const ZDITM_URL = "https://www.zditm.szczecin.pl/api/v1/displays";
const EXTERNAL_TIMEOUT_MS = 8_000;
const MAX_MINUTES_AHEAD = 60;
const MAX_NEARBY_GROUPS = 4;
const NEARBY_RADIUS_M = 1_500;
const SZCZECIN_ZONE = "S";
const POZNAN_ZONES = new Set(["A", "B", "C", "P", "D"]);

interface Departure {
  line: string;
  direction: string;
  minutes: number;
  time: string;
  is_realtime: boolean;
}

interface Bollard {
  bollard_code: string;
  departures: Departure[];
}

interface StopGroup {
  /** Dla ulubionych: favoriteKey() zapytania; dla "w pobliżu": klucz grupy. */
  key: string;
  stop_name: string;
  zone_id: string;
  lat: number;
  lon: number;
  stop_codes: string[];
  /** W sieci jest inna grupa o tej samej nazwie (np. w innej miejscowości). */
  ambiguous: boolean;
  distance?: number;
  bollards: Bollard[];
  /** Stary ulubiony (tylko nazwa) – dane, którymi klient może go uzupełnić. */
  resolved?: FavoriteStop;
}

interface RequestBody {
  lat?: number;
  lon?: number;
  stopNames?: (string | Partial<FavoriteStop>)[];
}

interface PekaTime {
  line: string;
  direction: string;
  minutes: number | string;
  realTime?: boolean | string;
}

interface ZditmDeparture {
  line_number: string;
  direction: string;
  time_real: number | null;
  time_scheduled: string | null;
}

function getPolandNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
}

function formatTimePl(date: Date): string {
  return date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, (m) => `\\${m}`);
}

function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(EXTERNAL_TIMEOUT_MS) });
}

function dedupeAndSort(departures: Departure[]): Departure[] {
  const seenRoutes = new Set<string>();
  return departures
    .filter((d) => {
      if (d.minutes > MAX_MINUTES_AHEAD || d.minutes < 0) return false;
      const routeKey = `${d.line}-${d.direction}`;
      if (seenRoutes.has(routeKey)) return false;
      seenRoutes.add(routeKey);
      return true;
    })
    .sort((a, b) => a.minutes - b.minutes);
}

async function callPeka(method: string, payload: Record<string, unknown>): Promise<unknown> {
  const body = new URLSearchParams();
  body.append("method", method);
  body.append("p0", JSON.stringify(payload));
  const response = await fetchWithTimeout(PEKA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body: body.toString(),
  });
  return response.json();
}

async function fetchPekaBollard(stopCode: string): Promise<Bollard | null> {
  try {
    const res = (await callPeka("getTimes", { symbol: stopCode })) as {
      success?: { times?: PekaTime[] };
    };
    const now = getPolandNow();
    const departures = dedupeAndSort(
      (res?.success?.times ?? []).map((t) => {
        const minutes = Number(t.minutes);
        return {
          line: t.line,
          direction: t.direction,
          minutes,
          time: formatTimePl(new Date(now.getTime() + minutes * 60_000)),
          is_realtime: t.realTime === true || String(t.realTime).toLowerCase() === "true",
        };
      })
    );
    return departures.length > 0 ? { bollard_code: stopCode, departures } : null;
  } catch {
    return null;
  }
}

async function fetchZditmBollard(stopCode: string): Promise<Bollard | null> {
  try {
    const res = await fetchWithTimeout(`${ZDITM_URL}/${stopCode}`, {
      headers: { "User-Agent": "DzisiajApp/1.0" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { departures?: ZditmDeparture[] };
    const now = getPolandNow();

    const departures = dedupeAndSort(
      (data.departures ?? []).flatMap((dep) => {
        let minutes: number | null = null;
        let isRealtime = false;
        let timeStr = dep.time_scheduled ?? "";

        if (dep.time_real !== null) {
          minutes = dep.time_real;
          isRealtime = true;
          timeStr = formatTimePl(new Date(now.getTime() + minutes * 60_000));
        } else if (dep.time_scheduled) {
          const [h, m] = dep.time_scheduled.split(":").map(Number);
          const scheduled = new Date(now);
          scheduled.setHours(h, m, 0, 0);
          if (scheduled < now) scheduled.setDate(scheduled.getDate() + 1);
          minutes = Math.round((scheduled.getTime() - now.getTime()) / 60_000);
        }

        if (minutes === null) return [];
        return [{
          line: dep.line_number,
          direction: dep.direction,
          minutes,
          time: timeStr || "??:??",
          is_realtime: isRealtime,
        }];
      })
    );
    return departures.length > 0 ? { bollard_code: stopCode, departures } : null;
  } catch {
    return null;
  }
}

function fetchBollard(stopCode: string, zoneId: string | null): Promise<Bollard | null> {
  return zoneId === SZCZECIN_ZONE ? fetchZditmBollard(stopCode) : fetchPekaBollard(stopCode);
}

const MAX_FAVORITES = 10;
const VALID_ZONES = new Set(["AUTO", SZCZECIN_ZONE, ...POZNAN_ZONES]);

type Db = SupabaseClient;

async function fetchBollardsForCluster(cluster: StopCluster, zoneOf: Map<string, string | null>): Promise<Bollard[]> {
  const results = await Promise.all(cluster.stop_codes.map((code) => fetchBollard(code, zoneOf.get(code) ?? cluster.zone_id)));
  return results.filter((b): b is Bollard => b !== null);
}

async function fetchPostsByNames(supabase: Db, names: string[]): Promise<StopPost[]> {
  const unique = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
  if (unique.length === 0) return [];
  const results = await Promise.all(
    unique.map((name) =>
      supabase
        .from("stops")
        .select("stop_code, stop_name, stop_lat, stop_lon, zone_id")
        .ilike("stop_name", escapeIlike(name))
    )
  );
  return results.flatMap((r) => (r.data ?? []) as StopPost[]);
}

function toGroup(cluster: StopCluster, bollards: Bollard[], ambiguous: Set<string>, key = cluster.key): StopGroup {
  return {
    key,
    stop_name: cluster.name,
    zone_id: cluster.zone_id,
    lat: cluster.lat,
    lon: cluster.lon,
    stop_codes: cluster.stop_codes,
    ambiguous: isAmbiguous(cluster, ambiguous),
    bollards,
  };
}

function parseFavorite(raw: string | Partial<FavoriteStop>): FavoriteStop | null {
  const fav: FavoriteStop = typeof raw === "string"
    ? { name: raw, zone_id: "AUTO" }
    : {
        name: typeof raw?.name === "string" ? raw.name.slice(0, 120) : "",
        zone_id: typeof raw?.zone_id === "string" ? raw.zone_id : "AUTO",
        ...(typeof raw?.lat === "number" && typeof raw?.lon === "number" ? { lat: raw.lat, lon: raw.lon } : {}),
      };
  if (!fav.name.trim() || !VALID_ZONES.has(fav.zone_id)) return null;
  return fav;
}

async function handleStopNamesRequest(
  supabase: Db,
  stopNames: (string | Partial<FavoriteStop>)[],
  userPos: { lat: number; lon: number } | null
): Promise<Response> {
  const favorites = stopNames.slice(0, MAX_FAVORITES).map(parseFavorite).filter((f): f is FavoriteStop => f !== null);
  const posts = await fetchPostsByNames(supabase, favorites.map((f) => f.name));
  const zoneOf = new Map(posts.map((p) => [p.stop_code as string, p.zone_id]));
  const clusters = clusterStops(posts);
  const ambiguous = ambiguousNames(clusters);

  const groups = await Promise.all(
    favorites.map(async (fav) => {
      const cluster = pickClusterForFavorite(fav, clusters, userPos);
      if (!cluster) return null;
      const bollards = await fetchBollardsForCluster(cluster, zoneOf);
      if (bollards.length === 0) return null;
      const group = toGroup(cluster, bollards, ambiguous, favoriteKey(fav));
      if (!hasPosition(fav)) group.resolved = favoriteFromCluster(cluster);
      return group;
    })
  );

  return new Response(
    JSON.stringify({ success: groups.filter((g): g is StopGroup => g !== null) }),
    { headers: jsonHeaders }
  );
}

async function handleNearbyRequest(supabase: Db, lat: number, lon: number): Promise<Response> {
  const dLat = 0.015;
  const dLon = 0.025;

  const { data } = await supabase
    .from("stops")
    .select("stop_code, stop_name, stop_lat, stop_lon, zone_id")
    .gte("stop_lat", lat - dLat)
    .lte("stop_lat", lat + dLat)
    .gte("stop_lon", lon - dLon)
    .lte("stop_lon", lon + dLon);

  const inBox = ((data ?? []) as StopPost[]).filter(
    (p) => distanceM(lat, lon, p.stop_lat, p.stop_lon) <= NEARBY_RADIUS_M
  );
  if (inBox.length === 0) {
    return new Response(JSON.stringify({ success: [], message: "Brak przystanków w pobliżu." }), { headers: jsonHeaders });
  }
  const nearest = clusterStops(inBox)
    .map((c) => ({
      c,
      d: Math.min(...inBox.filter((p) => c.stop_codes.includes(p.stop_code as string))
        .map((p) => distanceM(lat, lon, p.stop_lat, p.stop_lon))),
    }))
    .sort((a, b) => a.d - b.d)
    .slice(0, MAX_NEARBY_GROUPS);

  const allPosts = await fetchPostsByNames(supabase, nearest.map((n) => n.c.name));
  const zoneOf = new Map(allPosts.map((p) => [p.stop_code as string, p.zone_id]));
  const fullClusters = clusterStops(allPosts);
  const ambiguous = ambiguousNames(fullClusters);

  const groups = await Promise.all(
    nearest.map(async ({ c, d }) => {
      const full = fullClusters.find((fc) => fc.stop_codes.some((code) => c.stop_codes.includes(code))) ?? c;
      const bollards = await fetchBollardsForCluster(full, zoneOf);
      if (bollards.length === 0) return null;
      return { ...toGroup(full, bollards, ambiguous), distance: Math.round(d) };
    })
  );
  const finalSuccess = groups.filter((g): g is StopGroup & { distance: number } => g !== null);

  return new Response(
    JSON.stringify(finalSuccess.length > 0 ? { success: finalSuccess } : { success: [], message: "Brak aktywnych kursów w okolicy." }),
    { headers: jsonHeaders }
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(jwt);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Brak autoryzacji." }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  try {
    const { lat, lon, stopNames } = (await req.json()) as RequestBody;

    if (!stopNames && (!lat || !lon)) {
      return new Response(
        JSON.stringify({ error: "LOCATION_REQUIRED", message: "Brak współrzędnych GPS." }),
        { headers: jsonHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (stopNames && Array.isArray(stopNames)) {
      const userPos = typeof lat === "number" && typeof lon === "number" ? { lat, lon } : null;
      return await handleStopNamesRequest(supabase, stopNames, userPos);
    }

    if (lat && lon) {
      return await handleNearbyRequest(supabase, lat, lon);
    }

    return new Response(JSON.stringify({ success: [] }), { headers: jsonHeaders });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Błąd serwera.";
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: jsonHeaders });
  }
});
