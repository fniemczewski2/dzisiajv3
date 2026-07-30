// supabase/functions/transport-busmaps-v2/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, capi-key, capi-host, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

const normalizeName = (name: string) => {
  if (!name) return "";
  return name.normalize("NFC").trim().toLowerCase();
};

function limitDeps(deps: any[]) {
  const uniqueDeps = deps.filter((v, i, a) =>
    a.findIndex(t => t.line === v.line && t.direction === v.direction && t.minutes === v.minutes) === i
  ).sort((a, b) => a.minutes - b.minutes);

  const uniqueLinesCount = new Set(uniqueDeps.map(d => d.line)).size;
  const limit = uniqueLinesCount <= 3 ? 5 : 10;
  return uniqueDeps.slice(0, limit);
}

function detectCity(lat: number, lon: number): string {
  if (lat >= 52.20 && lat <= 52.60 && lon >= 16.70 && lon <= 17.15) return 'poznan';
  if (lat >= 53.25 && lat <= 53.60 && lon >= 14.40 && lon <= 14.80) return 'szczecin';
  return 'other';
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
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  try {
    const { lat, lon, search, stopNames } = await req.json();

    const bmApiKey = Deno.env.get("BUSMAPS_API_KEY");
    if (!bmApiKey) throw new Error("Brak klucza API BusMaps.");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const fetchOptions = {
      headers: {
        'capi-key': `Bearer ${bmApiKey}`,
        'capi-host': 'busmaps.com',
        'Content-Type': 'application/json'
      }
    };

    const city = (lat && lon) ? detectCity(lat, lon) : 'other';

    const fetchPoznanDepartures = async (stopName: string) => {
      const PEKA_URL = "https://www.peka.poznan.pl/vm/method.vm";
      const departures: any[] = [];
      const now = new Date();

      const bBody = new URLSearchParams();
      bBody.append('method', 'getBollardsByStopPoint');
      bBody.append('p0', JSON.stringify({ name: stopName }));

      const bRes = await fetch(PEKA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: bBody.toString()
      });
      const bollardsResponse = await bRes.json();
      const bollards = bollardsResponse?.success?.bollards;

      if (Array.isArray(bollards)) {
        for (const b of bollards) {
          const symbol = b?.bollard?.symbol;
          if (!symbol) continue;

          const tBody = new URLSearchParams();
          tBody.append('method', 'getTimes');
          tBody.append('p0', JSON.stringify({ symbol }));

          const tRes = await fetch(PEKA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body: tBody.toString()
          });
          const timesResponse = await tRes.json();
          const times = timesResponse?.success?.times;

          if (Array.isArray(times)) {
            times.forEach((t: any) => {
              const minutes = Number(t.minutes);
              const depDate = new Date(now.getTime() + minutes * 60000);
              departures.push({
                line: t.line,
                direction: t.direction,
                minutes: minutes,
                time: depDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
                delay: 0,
                is_realtime: Boolean(t.realTime),
              });
            });
          }
        }
      }
      return departures;
    };

    const fetchSzczecinDepartures = async (stopName: string) => {
      const { data: stops, error } = await supabase
        .from("stops")
        .select("stop_code")
        .eq("zone_id", "S")
        .ilike("stop_name", `%${stopName.trim()}%`);

      if (error || !stops?.length) return [];

      const fetches = stops.map(stop =>
        fetch(`https://www.zditm.szczecin.pl/api/v1/displays/${stop.stop_code}`, {
          headers: { "User-Agent": "DzisiajApp/1.0" }
        }).then(r => r.ok ? r.json() : null).catch(() => null)
      );

      const results = await Promise.all(fetches);
      const now = new Date();
      const departures: any[] = [];

      results.forEach(result => {
        result?.departures?.forEach((dep: any) => {
          let minutes: number | null = null;
          let isRealtime = false;
          let timeStr = dep.time_scheduled;

          if (dep.time_real !== null) {
            minutes = dep.time_real;
            isRealtime = true;
            const depDate = new Date(now.getTime() + minutes * 60000);
            timeStr = depDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
          } else if (dep.time_scheduled) {
            const [h, m] = dep.time_scheduled.split(":").map(Number);
            const scheduled = new Date(now);
            scheduled.setHours(h, m, 0, 0);
            if (scheduled < now) scheduled.setDate(scheduled.getDate() + 1);
            minutes = Math.round((scheduled.getTime() - now.getTime()) / 60000);
          }

          if (minutes !== null && minutes >= 0 && minutes <= 120) {
            departures.push({
              line: dep.line_number,
              direction: dep.direction,
              minutes,
              time: timeStr || "??:??",
              delay: 0,
              is_realtime: isRealtime
            });
          }
        });
      });
      return departures;
    };

    const getNearbyNamesFromBusMaps = async (latitude: number, longitude: number) => {
      const url = `https://capi.busmaps.com:8443/stopsInRadius?radius=2000&lat=${latitude}&lon=${longitude}`;
      const res = await fetch(url, fetchOptions);
      if (!res.ok) return [];
      const data = await res.json();
      const stopsArray = data.stops || data.data || data || [];

      const groupsMap = new Map<string, any>();
      stopsArray.forEach((s: any) => {
        const stopName = s.stopName || s.stop_name || s.name;
        if (!stopName) return;
        const normName = normalizeName(stopName);
        const dist = calculateDistance(latitude, longitude, s.stopLat || s.lat || latitude, s.stopLon || s.lon || longitude);

        if (!groupsMap.has(normName) || dist < groupsMap.get(normName).distance) {
          groupsMap.set(normName, { originalName: stopName, distance: dist });
        }
      });
      return Array.from(groupsMap.values()).sort((a, b) => a.distance - b.distance).slice(0, 3);
    };

    const fetchBusMapsDepartures = async (latitude: number, longitude: number, radius = 2000) => {
      const url = `https://capi.busmaps.com:8443/nextDepartures?location=${latitude},${longitude}&radius=${radius}&results=100`;
      const res = await fetch(url, fetchOptions);
      if (!res.ok) throw new Error("Błąd BusMaps API dla odjazdów.");
      const data = await res.json();

      let departuresList = Array.isArray(data) ? data : (data.stopDepartures || data.departures || data.data || []);
      const groupsMap = new Map<string, any>();
      const now = new Date();
      const currMins = now.getHours() * 60 + now.getMinutes();

      departuresList.forEach((stop: any) => {
        const stopName = stop.stopName || stop.stop_name || stop.name || "Nieznany Przystanek";
        const normName = normalizeName(stopName);

        if (!groupsMap.has(normName)) {
          groupsMap.set(normName, {
            stop_name: stopName,
            distance: calculateDistance(latitude, longitude, stop.stopLat || latitude, stop.stopLon || longitude),
            departures: []
          });
        }
        const group = groupsMap.get(normName);
        const depList = stop.departureList || (stop.line ? [stop] : []);

        depList.forEach((dep: any) => {
          const scheduledTime = dep.departureTime || dep.scheduled_time;
          const estimatedTime = dep.rtDepartureTime || dep.estimated_departure_time;
          const timeStr = estimatedTime || scheduledTime;
          if (!timeStr) return;

          const parts = timeStr.split(':').map(Number);
          let depTotalMins = parts[0] * 60 + parts[1];
          if (depTotalMins < currMins - 120) depTotalMins += 1440;
          let etaMin = depTotalMins - currMins;

          if (etaMin < -1 || etaMin > 120) return;

          group.departures.push({
            line: dep.routeShortName || dep.route_short_name || dep.line || "??",
            direction: dep.tripHeadsign || dep.trip_headsign || dep.direction || "Kierunek",
            minutes: etaMin,
            time: `${String(parts[0]).padStart(2, '0')}:${String(parts[1]).padStart(2, '0')}`,
            is_realtime: !!estimatedTime,
            delay: 0
          });
        });
      });

      const finalGroups = Array.from(groupsMap.values()).map(group => {
        group.departures = limitDeps(group.departures);
        return group;
      });

      return finalGroups.filter(g => g.departures.length > 0).sort((a, b) => a.distance - b.distance);
    };

    if (search) {
      let url = `https://capi.busmaps.com:8443/stopsInRadius?radius=50000`;
      url += (lat && lon) ? `&lat=${lat}&lon=${lon}` : `&lat=52.4064&lon=16.9252`;

      const res = await fetch(url, fetchOptions);
      if (!res.ok) throw new Error("Błąd wyszukiwania BusMaps.");
      const data = await res.json();

      const stopsArray = data.stops || data.data || data || [];
      const uniqueNamesMap = new Map();
      const searchTerm = normalizeName(search);

      stopsArray.forEach((s: any) => {
        const stopName = s.stopName || s.stop_name || s.name;
        if (!stopName) return;
        const norm = normalizeName(stopName);
        if (norm.includes(searchTerm) && !uniqueNamesMap.has(norm)) uniqueNamesMap.set(norm, stopName);
      });

      const results = Array.from(uniqueNamesMap.values()).map(name => ({ name })).slice(0, 10);
      return new Response(JSON.stringify({ success: results }), { headers: corsHeaders });
    }

    if (stopNames && Array.isArray(stopNames)) {
      const results = [];
      const cityLat = lat || 52.4064;
      const cityLon = lon || 16.9252;
      const detectedCity = detectCity(cityLat, cityLon);

      for (const name of stopNames) {
        let deps: any[] = [];

        if (detectedCity === 'poznan') deps = await fetchPoznanDepartures(name);
        else if (detectedCity === 'szczecin') deps = await fetchSzczecinDepartures(name);

        if (deps.length > 0) {
          results.push({ stop_name: name, distance: undefined, departures: limitDeps(deps) });
        }
      }

      if (results.length === 0) {
        const allGroups = await fetchBusMapsDepartures(cityLat, cityLon, 15000);
        const filteredGroups = allGroups.filter(g =>
          stopNames.some(favName => normalizeName(g.stop_name) === normalizeName(favName))
        );
        return new Response(JSON.stringify({ success: filteredGroups }), { headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: results }), { headers: corsHeaders });
    }

    if (lat && lon) {
      if (city === 'poznan') {
        const names = await getNearbyNamesFromBusMaps(lat, lon);
        const results = [];
        for (const item of names) {
          const deps = await fetchPoznanDepartures(item.originalName);
          if (deps.length > 0) {
            results.push({ stop_name: item.originalName, distance: item.distance, departures: limitDeps(deps) });
          }
        }
        if (results.length === 0) return new Response(JSON.stringify({ error: "Usługa niedostępna w Twojej okolicy." }), { headers: corsHeaders });
        return new Response(JSON.stringify({ success: results }), { headers: corsHeaders });

      } else if (city === 'szczecin') {
        const names = await getNearbyNamesFromBusMaps(lat, lon);
        const results = [];
        for (const item of names) {
          const deps = await fetchSzczecinDepartures(item.originalName);
          if (deps.length > 0) {
            results.push({ stop_name: item.originalName, distance: item.distance, departures: limitDeps(deps) });
          }
        }
        if (results.length === 0) return new Response(JSON.stringify({ error: "Usługa niedostępna w Twojej okolicy." }), { headers: corsHeaders });
        return new Response(JSON.stringify({ success: results }), { headers: corsHeaders });

      } else {
        const deps = await fetchBusMapsDepartures(lat, lon, 2000);
        if (deps.length === 0) {
           return new Response(JSON.stringify({ error: "Usługa niedostępna w Twojej okolicy." }), { headers: corsHeaders });
        }
        return new Response(JSON.stringify({ success: deps.slice(0, 3) }), { headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ success: [] }), { headers: corsHeaders });
  } catch (error: any) {
    console.error("Błąd Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});
