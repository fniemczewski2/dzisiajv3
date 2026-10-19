// hooks/useNews.ts

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { NewsItem, NewsResponse } from "@/pages/api/news";

interface NewsState {
  items: NewsItem[];
  status: Record<string, string | null>;
  updatedAt: Date;
}

const NO_ITEMS: NewsItem[] = [];
const NO_STATUS: Record<string, string | null> = {};

async function fetchNews({ signal }: { signal: AbortSignal }): Promise<NewsState> {
  const res = await fetch("/api/news", { signal });
  const body = (await res.json().catch(() => ({}))) as Partial<NewsResponse> & { error?: string };
  if (!res.ok) throw new Error(body.error ?? "Nie udało się pobrać wiadomości.");
  return { items: body.items ?? [], status: body.status ?? {}, updatedAt: new Date() };
}

/** Wiadomości z kanałów RSS (TanStack Query – powrót na stronę nie pobiera ich od nowa). */
export function useNews() {
  const query = useQuery({ queryKey: ["news"], queryFn: fetchNews });
  const refetch = query.refetch;
  const reload = useCallback(async () => {
    await refetch();
  }, [refetch]);
  let error: string | null = null;
  if (query.error) error = query.error instanceof Error ? query.error.message : "Nie udało się pobrać wiadomości.";

  return {
    items: query.data?.items ?? NO_ITEMS,
    status: query.data?.status ?? NO_STATUS,
    loading: query.isFetching,
    error,
    updatedAt: query.data?.updatedAt ?? null,
    reload,
  };
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
