// pages/api/news.ts
//
// GET  /api/news          → wiadomości z wybranych źródeł użytkownika
// POST /api/news?check=1  → sprawdzenie własnego kanału przed dodaniem ({ url })
//
// Źródła i własne kanały czytamy z ustawień zalogowanego użytkownika – klient
// nie może podać dowolnego adresu do pobrania (poza sprawdzeniem z kontrolą SSRF).

import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { RSS_SOURCES, normalizeCustomFeeds, resolveEnabledSources } from "@/config/rssSources";
import { getFeed, checkPublicUrl } from "@/lib/server/rss";
import { checkRateLimit } from "@/lib/server/rateLimit";
import { mapPool } from "@/lib/asyncPool";

export interface NewsItem {
  sourceId: string;
  title: string;
  link: string;
  published: string | null;
  summary: string;
}

export interface NewsResponse {
  items: NewsItem[];
  status: Record<string, string | null>;
}

const MAX_ITEMS = 300;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabase(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Brak autoryzacji." });

  if (!checkRateLimit(`news:${user.id}`, 20, 60_000)) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ error: "Zbyt wiele odświeżeń. Spróbuj za minutę." });
  }

  if (req.method === "POST" && req.query.check === "1") {
    const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
    const problem = await checkPublicUrl(url);
    if (problem) return res.status(400).json({ error: problem });
    const result = await getFeed(url, true);
    if (result.error) return res.status(400).json({ error: result.error });
    return res.status(200).json({ ok: true, count: result.items.length, sample: result.items[0]?.title ?? null });
  }

  if (req.method !== "GET") return res.status(405).json({ error: "Metoda niedozwolona." });

  const { data } = await supabase.from("settings").select("*").eq("user_id", user.id).maybeSingle();
  const custom = normalizeCustomFeeds(data?.rss_custom);
  const enabled = new Set(resolveEnabledSources(data?.rss_sources, custom.map((c) => c.id)));

  const feeds = [
    ...RSS_SOURCES.filter((s) => enabled.has(s.id)).map((s) => ({ id: s.id, url: s.url, guard: false })),
    ...custom.filter((c) => enabled.has(c.id)).map((c) => ({ id: c.id, url: c.url, guard: true })),
  ];

  const status: Record<string, string | null> = {};
  const items: NewsItem[] = [];
  await mapPool(feeds, 6, async (feed) => {
    const result = await getFeed(feed.url, feed.guard);
    status[feed.id] = result.error;
    for (const item of result.items) items.push({ sourceId: feed.id, ...item });
  });

  // Najnowsze na górze; wpisy bez daty na końcu. Ten sam link z kilku źródeł – raz.
  const seen = new Set<string>();
  const sorted = items
    .sort((a, b) => (b.published ?? "").localeCompare(a.published ?? ""))
    .filter((i) => (seen.has(i.link) ? false : (seen.add(i.link), true)))
    .slice(0, MAX_ITEMS);

  res.setHeader("Cache-Control", "private, max-age=300");
  return res.status(200).json({ items: sorted, status } satisfies NewsResponse);
}
