// supabase/functions/transport-busmaps-v3/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, capi-key, capi-host, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json'
};

const getPolandTime = () => {
  const now = new Date();
  const polandStr = now.toLocaleString("en-US", { timeZone: "Europe/Warsaw" });
  return new Date(polandStr);
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const cleanStopNameForDb = (name: string) => {
  if (!name) return "";
  return name.replace(/\s+\d+$/, '').replace(/\s*\(.*?\)\s*/g, '').trim();
};

function limitDepsByBollard(times: any[]) {
  const seenRoutes = new Set();
  const now = getPolandTime();

  return times
    .map(t => {
      const mins = Number(t.minutes);

      const isRealTime =
        t.realTime === true ||
        String(t.realTime).toLowerCase() === "true" ||
        t.is_realtime === true ||
        String(t.is_realtime).toLowerCase() === "true";

      return {
        line: t.line,
        direction: t.direction,
        minutes: mins,
        time: t.time || new Date(now.getTime() + mins * 60000).toLocaleTimeString('pl-PL', {
          hour: '2-digit', minute: '2-digit'
        }),
        is_realtime: isRealTime
      };
    })
    .filter(t => {
      if (t.minutes > 60 || t.minutes < 0) return false;

      const routeKey = `${t.line}-${t.direction}`;
      if (seenRoutes.has(routeKey)) return false;

      seenRoutes.add(routeKey);
      return true;
    })
    .sort((a, b) => a.minutes - b.minutes);
}

const PEKA_URL = "https://www.peka.poznan.pl/vm/method.vm";

async function callPeka(method: string, payload: any) {
  const body = new URLSearchParams()
  body.append('method', method)
  body.append('p0', JSON.stringify(payload))
  const response = await fetch(PEKA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: body.toString(),
  })
  return response.json()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  const { data: { user }, error: authUserError } = await supabaseAuth.auth.getUser(jwt);
  if (authUserError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
  }

  try {
    const { lat, lon, stopNames } = await req.json();

    if (!stopNames && (!lat || !lon || lat === 0 || lon === 0)) {
      return new Response(JSON.stringify({
        error: "LOCATION_REQUIRED",
        message: "Brak współrzędnych GPS."
      }), { headers: jsonHeaders });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const poznanZones = ['A', 'B', 'C', 'P', 'D'];

    if (stopNames && Array.isArray(stopNames)) {
      const results = await Promise.all(stopNames.map(async (stop) => {
        const name = typeof stop === 'string' ? stop : stop.name;
        const zone = typeof stop === 'string' ? 'AUTO' : stop.zone_id;
        const cleanName = cleanStopNameForDb(name);

        if (poznanZones.includes(zone) || zone === 'AUTO') {
          const { data: dbBollards } = await supabase
            .from("stops")
            .select("stop_code, stop_name")
            .ilike("stop_name", `%${cleanName}%`);

          if (!dbBollards || dbBollards.length === 0) return null;

          const bollardResults = await Promise.all(dbBollards.map(async (b) => {
            try {
              const tRes = await callPeka('getTimes', { symbol: b.stop_code });
              const times = tRes?.success?.times || [];
              const filtered = limitDepsByBollard(times);

              return filtered.length > 0 ? {
                bollard_code: b.stop_code,
                departures: filtered
              } : null;
            } catch { return null; }
          }));

          const validBollards = bollardResults.filter(Boolean);

          return validBollards.length > 0 ? {
            stop_name: name,
            zone_id: zone,
            bollards: validBollards
          } : null;
        }
        return null;
      }));

      return new Response(JSON.stringify({ success: results.filter(Boolean) }), { headers: jsonHeaders });
    }

    if (lat && lon) {
      const dLat = 0.015; const dLon = 0.025;

      const { data: dbStops } = await supabase.from("stops")
        .select("*")
        .gte("stop_lat", lat - dLat)
        .lte("stop_lat", lat + dLat)
        .gte("stop_lon", lon - dLon)
        .lte("stop_lon", lon + dLon);

      if (!dbStops || dbStops.length === 0) {
        return new Response(JSON.stringify({ error: "Brak przystanków w pobliżu." }), { headers: jsonHeaders });
      }

      const localGroups = new Map();
      dbStops.forEach(s => {
        const dist = calculateDistance(lat, lon, s.stop_lat, s.stop_lon);
        if (dist <= 1500) {
          const norm = s.stop_name.normalize("NFC").trim().toLowerCase();
          if (!localGroups.has(norm) || dist < localGroups.get(norm).distance) {
            localGroups.set(norm, { name: s.stop_name, zone: s.zone_id, distance: dist });
          }
        }
      });

      const sortedGroups = Array.from(localGroups.values())
        .sort((a,b) => a.distance - b.distance)
        .slice(0, 4);

      const nearbyResults = await Promise.all(sortedGroups.map(async (item) => {
        const { data: bollards } = await supabase.from("stops")
          .select("stop_code")
          .eq("stop_name", item.name);

        if (!bollards) return null;

        const bollardDeps = await Promise.all(bollards.map(async b => {
          try {
            const res = await callPeka('getTimes', { symbol: b.stop_code });
            const filtered = limitDepsByBollard(res?.success?.times || []);
            return filtered.length > 0 ? { bollard_code: b.stop_code, departures: filtered } : null;
          } catch { return null; }
        }));

        const activeBollards = bollardDeps.filter(Boolean);

        return activeBollards.length > 0 ? {
           stop_name: item.name,
           zone_id: item.zone,
           distance: Math.round(item.distance),
           bollards: activeBollards
        } : null;
      }));

      const finalSuccess = nearbyResults.filter(Boolean);

      if (finalSuccess.length === 0) {
         return new Response(JSON.stringify({ error: "Brak aktywnych kursów w okolicy." }), { headers: jsonHeaders });
      }

      return new Response(JSON.stringify({ success: finalSuccess }), { headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ success: [] }), { headers: jsonHeaders });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: jsonHeaders });
  }
});
