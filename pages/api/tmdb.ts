// pages/api/tmdb.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabase } from "@/lib/supabase/server";

const TMDB_BASE = "https://api.themoviedb.org/3";

const ALLOWED_PATHS: readonly RegExp[] = [
  /^\/search\/(movie|tv|multi)$/,
  /^\/(movie|tv)\/\d{1,10}$/,
  /^\/(movie|tv)\/\d{1,10}\/watch\/providers$/,
];

const ALLOWED_PARAMS: Record<string, (v: string) => boolean> = {
  query: (v) => v.trim().length > 0 && v.length <= 200,
  page: (v) => /^\d{1,3}$/.test(v),
  year: (v) => /^\d{4}$/.test(v),
  append_to_response: (v) => v === "watch/providers",
};

export function isAllowedPath(path: string): boolean {
  return ALLOWED_PATHS.some((re) => re.test(path));
}

export function buildTmdbUrl(path: string, query: Record<string, unknown>, apiKey: string): URL {
  const url = new URL(`${TMDB_BASE}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (typeof value !== "string") continue;
    const validate = ALLOWED_PARAMS[key];
    if (validate?.(value)) url.searchParams.set(key, value);
  }
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "pl-PL");
  url.searchParams.set("include_adult", "false");
  return url;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Metoda niedozwolona." });

  const supabase = createServerSupabase(req, res);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return res.status(401).json({ error: "Brak autoryzacji." });

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Brak zmiennej środowiskowej TMDB_API_KEY" });

  const { path, ...queryParams } = req.query;
  if (!path || typeof path !== "string") {
    return res.status(400).json({ error: "Wymagany parametr: path" });
  }

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(path);
  } catch {
    return res.status(400).json({ error: "Nieprawidłowa ścieżka." });
  }
  if (!isAllowedPath(decodedPath)) {
    return res.status(403).json({ error: "Niedozwolona ścieżka TMDB." });
  }

  try {
    const tmdbRes = await fetch(buildTmdbUrl(decodedPath, queryParams, apiKey).toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!tmdbRes.ok) {
      const status = tmdbRes.status === 404 ? 404 : 502;
      return res.status(status).json({ error: status === 404 ? "Nie znaleziono w TMDB." : "Wystąpił błąd API TMDB" });
    }
    const data = await tmdbRes.json();
    res.setHeader("Cache-Control", "private, max-age=600");
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: "Wystąpił błąd TMDB" });
  }
}
