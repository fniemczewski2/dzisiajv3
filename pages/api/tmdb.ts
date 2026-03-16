import type { NextApiRequest, NextApiResponse } from "next";

const TMDB_BASE = "https://api.themoviedb.org/3";

const ALLOWED_PATH_PREFIXES = [
  "/search/movie",
  "/movie/",
];

function isAllowedPath(path: string): boolean {
  return ALLOWED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    throw new Error("Brak zmiennej środowiskowej TMDB_API_KEY");
  }

  const { path, ...queryParams } = req.query;

  if (!path || typeof path !== "string") {
    return res.status(400).json({ error: "Wymagany parametr: path" });
  }

  const decodedPath = decodeURIComponent(path);
  if (!isAllowedPath(decodedPath)) {
    return res.status(403).json({ error: "Niedozwolona ścieżka TMDB." });
  }

  const url = new URL(`${TMDB_BASE}${decodedPath}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "pl-PL");

  for (const [key, value] of Object.entries(queryParams)) {
    if (typeof value === "string") {
      url.searchParams.set(key, value);
    }
  }

  try {
    const tmdbRes = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!tmdbRes.ok) {
      throw new Error("Wystąpił bład TMDB");
    }

    const data = await tmdbRes.json();

    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=60");
    return res.status(200).json(data);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error("Wystąpił błąd timeout podczas żądania do TMDB");
    }
    throw new Error("Wystąpił nieoczekiwany błąd");
  }
}