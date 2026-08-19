// supabase/functions/transport-departures/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
  stop_name: string;
  zone_id: string;
  distance?: number;
  bollards: Bollard[];
}

interface FavoriteStop {
  name: string;
  zone_id?: string;
}

interface RequestBody {
  lat?: number;
  lon?: number;
  stopNames?: (string | FavoriteStop)[];
}

interface StopRow {
  stop_code: string | null;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  zone_id: string | null;
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

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeName(name: string): string {
  return name ? name.normalize("NFC").trim().toLowerCase() : "";
}

function cleanStopNameForDb(name: string): string {
  if (!name) return "";
  // `[^)]*` instead of a lazy `.*?` inside the parens — same result, no
  // backtracking ambiguity to flag (S8786).
  return name.replace(/\s+\d+$/, "").replace(/\s*\([^)]*\)\s*/g, "").trim();
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

async function buildGroup(
  supabase: ReturnType<typeof createClient>,
  stopName: string,
  zoneId: string,
  distance?: number
): Promise<StopGroup | null> {
  const { data } = await supabase
    .from("stops")
    .select("stop_code, zone_id")
    .eq("stop_name", stopName);

  const rows = (data ?? []) as Pick<StopRow, "stop_code" | "zone_id">[];
  const bollardResults = await Promise.all(
    rows
      .filter((b) => b.stop_code)
      .map((b) => fetchBollard(b.stop_code as string, b.zone_id))
  );
  const bollards = bollardResults.filter((b): b is Bollard => b !== null);

  if (bollards.length === 0) return null;
  const group: StopGroup = { stop_name: stopName, zone_id: zoneId, bollards };
  if (distance !== undefined) group.distance = Math.round(distance);
  return group;
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
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
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
      const results = await Promise.all(
        stopNames.map(async (stop) => {
          const name = typeof stop === "string" ? stop : stop.name;
          const zone = typeof stop === "string" ? "AUTO" : (stop.zone_id ?? "AUTO");
          if (!name) return null;
          if (zone !== "AUTO" && zone !== SZCZECIN_ZONE && !POZNAN_ZONES.has(zone)) return null;

          const cleanName = escapeIlike(cleanStopNameForDb(name));
          const { data } = await supabase
            .from("stops")
            .select("stop_code, stop_name, zone_id")
            .ilike("stop_name", `%${cleanName}%`);

          const rows = (data ?? []) as Pick<StopRow, "stop_code" | "stop_name" | "zone_id">[];
          if (rows.length === 0) return null;

          const bollardResults = await Promise.all(
            rows
              .filter((b) => b.stop_code)
              .map((b) => fetchBollard(b.stop_code as string, b.zone_id))
          );
          const bollards = bollardResults.filter((b): b is Bollard => b !== null);

          return bollards.length > 0
            ? { stop_name: name, zone_id: zone, bollards } satisfies StopGroup
            : null;
        })
      );

      return new Response(
        JSON.stringify({ success: results.filter((g): g is StopGroup => g !== null) }),
        { headers: jsonHeaders }
      );
    }

    if (lat && lon) {
      const dLat = 0.015;
      const dLon = 0.025;

      const { data } = await supabase
        .from("stops")
        .select("stop_code, stop_name, stop_lat, stop_lon, zone_id")
        .gte("stop_lat", lat - dLat)
        .lte("stop_lat", lat + dLat)
        .gte("stop_lon", lon - dLon)
        .lte("stop_lon", lon + dLon);

      const dbStops = (data ?? []) as StopRow[];
      if (dbStops.length === 0) {
        return new Response(
          JSON.stringify({ success: [], message: "Brak przystanków w pobliżu." }),
          { headers: jsonHeaders }
        );
      }

      const localGroups = new Map<string, { name: string; zone: string; distance: number }>();
      for (const s of dbStops) {
        const dist = calculateDistance(lat, lon, s.stop_lat, s.stop_lon);
        if (dist > NEARBY_RADIUS_M) continue;
        const norm = normalizeName(s.stop_name);
        const existing = localGroups.get(norm);
        if (!existing || dist < existing.distance) {
          localGroups.set(norm, { name: s.stop_name, zone: s.zone_id ?? "AUTO", distance: dist });
        }
      }

      const sortedGroups = Array.from(localGroups.values())
        .sort((a, b) => a.distance - b.distance)
        .slice(0, MAX_NEARBY_GROUPS);

      const nearbyResults = await Promise.all(
        sortedGroups.map((item) => buildGroup(supabase, item.name, item.zone, item.distance))
      );
      const finalSuccess = nearbyResults.filter((g): g is StopGroup => g !== null);

      return new Response(
        JSON.stringify(
          finalSuccess.length > 0
            ? { success: finalSuccess }
            : { success: [], message: "Brak aktywnych kursów w okolicy." }
        ),
        { headers: jsonHeaders }
      );
    }

    return new Response(JSON.stringify({ success: [] }), { headers: jsonHeaders });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: jsonHeaders });
  }
});
