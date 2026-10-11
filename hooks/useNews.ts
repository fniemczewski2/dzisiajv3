// hooks/useNews.ts

import { useCallback, useEffect, useState } from "react";
import type { NewsItem, NewsResponse } from "@/pages/api/news";

export function useNews() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [status, setStatus] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/news");
      const body = (await res.json().catch(() => ({}))) as Partial<NewsResponse> & { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Nie udało się pobrać wiadomości.");
      setItems(body.items ?? []);
      setStatus(body.status ?? {});
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się pobrać wiadomości.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, status, loading, error, updatedAt, reload: load };
}

export async function checkCustomFeed(url: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch("/api/news?check=1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string; count?: number; sample?: string | null };
  if (!res.ok) return { ok: false, message: body.error ?? "Nie udało się sprawdzić kanału." };
  const example = body.sample ? `, np. „${body.sample}”` : "";
  return { ok: true, message: `Działa – ${body.count ?? 0} wpisów${example}.` };
}
