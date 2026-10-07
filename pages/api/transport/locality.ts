// pages/api/transport/locality.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/server/rateLimit";

const PHOTON_URL = "https://photon.komoot.io/reverse";
const CACHE_MAX = 5000;
const cache = new Map<string, string | null>();
const BOUNDS = { minLat: 49, maxLat: 55, minLon: 14, maxLon: 24.2 };

interface PhotonFeature {
  properties?: {
    city?: string;
    town?: string;
    village?: string;
    locality?: string;
    district?: string;
    county?: string;
  };
}

export function parseCoord(raw: unknown, min: number, max: number): number | null {
  if (typeof raw !== "string" || !/^-?\d{1,3}(\.\d{1,8})?$/.test(raw)) return null;
  const v = Number(raw);
  return v >= min && v <= max ? v : null;
}

export function pickLocality(feature: PhotonFeature | undefined): string | null {
  const p = feature?.properties;
  if (!p) return null;
  const value = p.city || p.town || p.village || p.locality || p.district || p.county;
  return value ? value.slice(0, 80) : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Metoda niedozwolona." });

  const supabase = createServerSupabase(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Brak autoryzacji." });

  const lat = parseCoord(req.query.lat, BOUNDS.minLat, BOUNDS.maxLat);
  const lon = parseCoord(req.query.lon, BOUNDS.minLon, BOUNDS.maxLon);
  if (lat === null || lon === null) return res.status(400).json({ error: "Nieprawidłowe współrzędne." });

  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (cache.has(key)) {
    res.setHeader("Cache-Control", "private, max-age=86400");
    return res.status(200).json({ locality: cache.get(key) });
  }

  if (!checkRateLimit(`locality:${user.id}`, 60, 60_000)) {
    return res.status(429).json({ error: "Zbyt wiele zapytań." });
  }

  try {
    const url = new URL(PHOTON_URL);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("limit", "1");
    const upstream = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "dzisiaj.fun (https://dzisiaj.fun)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!upstream.ok) return res.status(502).json({ locality: null });

    const data = (await upstream.json()) as { features?: PhotonFeature[] };
    const locality = pickLocality(data.features?.[0]);

    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(key, locality);

    res.setHeader("Cache-Control", "private, max-age=86400");
    return res.status(200).json({ locality });
  } catch {
    return res.status(502).json({ locality: null });
  }
}
