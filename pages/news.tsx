// pages/news.tsx
//
// Wiadomości z wybranych kanałów RSS: filtr grup, wyszukiwanie, ładowanie
// porcjami. Linki otwierają się w nowej karcie (ogłoszone czytnikom ekranu).

import { NEWS_PAGE_SIZE } from "@/config/limits";
import React, { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import Seo from "@/components/ui/SEO";
import SearchBar from "@/components/ui/SearchBar";
import NoResultsState from "@/components/ui/NoResultsState";
import NewsSourcesPanel from "@/components/news/NewsSourcesPanel";
import { useNews } from "@/hooks/useNews";
import { useSettings } from "@/hooks/db/useSettings";
import {
  RSS_SOURCES,
  normalizeCustomFeeds,
  resolveEnabledSources,
  type CustomFeed,
  type RssGroup,
} from "@/config/rssSources";
import { RefreshButton } from "@/components/ui/CommonButtons";

const OWN_GROUP = "Własne kanały";
const rtf = new Intl.RelativeTimeFormat("pl", { numeric: "auto" });
const dateFmt = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function relative(iso: string | null): string {
  if (!iso) return "";
  const diffMin = Math.round((Date.parse(iso) - Date.now()) / 60_000);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  if (Math.abs(diffMin) < 24 * 60) return rtf.format(Math.round(diffMin / 60), "hour");
  return dateFmt.format(new Date(iso));
}

export default function NewsPage() {
  const { settings, updateSettings, loading: saving } = useSettings();
  const { items, status, loading, error, updatedAt, reload } = useNews();
  const [showSources, setShowSources] = useState(false);
  const [group, setGroup] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(NEWS_PAGE_SIZE);

  const custom = normalizeCustomFeeds(settings.rss_custom);
  const enabled = resolveEnabledSources(
    settings.rss_sources,
    custom.map((c) => c.id)
  );

  const sourceInfo = useMemo(() => {
    const map = new Map<string, { name: string; group: string }>();
    RSS_SOURCES.forEach((s) => map.set(s.id, { name: s.name, group: s.group }));
    custom.forEach((c) => map.set(c.id, { name: c.name, group: OWN_GROUP }));
    return map;
  }, [custom]);

  const groups = useMemo(() => {
    const present = new Set(items.map((i) => sourceInfo.get(i.sourceId)?.group).filter(Boolean) as string[]);
    return [...new Set<string>([...RSS_SOURCES.map((s) => s.group as RssGroup), OWN_GROUP])].filter((g) =>
      present.has(g)
    );
  }, [items, sourceInfo]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pl");
    return items.filter((i) => {
      if (group && sourceInfo.get(i.sourceId)?.group !== group) return false;
      return !q || `${i.title} ${i.summary}`.toLocaleLowerCase("pl").includes(q);
    });
  }, [items, group, query, sourceInfo]);

  const failed = Object.entries(status).filter(([, e]) => e).length;

  const saveSources = async (nextEnabled: string[], nextCustom: CustomFeed[]) => {
    const { error: saveError } = await updateSettings({ rss_sources: nextEnabled, rss_custom: nextCustom });
    if (!saveError) {
      setShowSources(false);
      void reload();
    }
  };

  return (
    <>
      <Seo
        title="Wiadomości"
        description="Wiadomości z wybranych kanałów RSS w jednym miejscu."
        canonical="https://dzisiaj.fun/news"
        keywords="rss, wiadomości, czytnik rss"
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="page-title">Wiadomości</h1>
        <div className="flex gap-2">
          <RefreshButton onClick={() => void reload()} small />
          <button
            type="button"
            onClick={() => setShowSources((v) => !v)}
            aria-expanded={showSources}
            className="flex min-h-11 items-center gap-2 rounded-lg bg-secondary px-3 text-sm font-semibold text-white hover:bg-secondary-hover"
          >
            Źródła
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {showSources && (
        <div className="mb-6">
          <NewsSourcesPanel
            enabled={enabled}
            custom={custom}
            status={status}
            saving={saving}
            onSave={(e, c) => void saveSources(e, c)}
            onClose={() => setShowSources(false)}
          />
        </div>
      )}

      <p aria-live="polite" className="mb-3 text-sm text-text-secondary">
        {loading && "Pobieram wiadomości…"}
        {!loading &&
          updatedAt &&
          `Zaktualizowano ${updatedAt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}. `}
        {!loading &&
          failed > 0 &&
          `Nie udało się pobrać ${failed} ${failed === 1 ? "źródła" : "źródeł"} – szczegóły w „Źródła”.`}
      </p>
      {error && (
        <p role="alert" className="mb-4 text-danger">
          {error}
        </p>
      )}

      {groups.length > 1 && (
        <fieldset className="-mx-3 mb-4 min-w-0 sm:mx-0">
          <legend className="sr-only">Filtruj po temacie</legend>

          <ul className="flex gap-2 overflow-x-auto px-3 pb-1 sm:flex-wrap sm:px-0">
            {[null, ...groups].map((g) => (
              <li key={g ?? "all"} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={group === g}
                  onClick={() => {
                    setGroup(g);
                    setLimit(NEWS_PAGE_SIZE);
                  }}
                  className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
                    group === g
                      ? "border-text bg-text text-card"
                      : "border-line-strong bg-card text-text-secondary hover:text-text"
                  }`}
                >
                  {g ?? "Wszystkie"}
                </button>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <div className="mb-4 max-w-xl">
        <SearchBar
          value={query}
          onChange={(v: string) => {
            setQuery(v);
            setLimit(NEWS_PAGE_SIZE);
          }}
          placeholder="Szukaj w wiadomościach..."
        />
      </div>

      {!loading && filtered.length === 0 && <NoResultsState text="wiadomości" />}

      <ul className="max-w-3xl divide-y divide-line">
        {filtered.slice(0, limit).map((item) => {
          const info = sourceInfo.get(item.sourceId);
          return (
            <li key={`${item.sourceId}-${item.link}`}>
              <article className="py-4">
                <p className="mb-1 text-sm text-text-secondary">
                  <span className="font-semibold">{info?.name ?? item.sourceId}</span>
                  {item.published && (
                    <>
                      <span aria-hidden="true"> – </span>
                      <time dateTime={item.published}>{relative(item.published)}</time>
                    </>
                  )}
                </p>
                <h2 className="section-title leading-snug">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-4 hover:underline"
                  >
                    {item.title}
                    <span className="sr-only"> (otwiera się w nowej karcie)</span>
                  </a>
                </h2>
                {item.summary && <p className="mt-1 line-clamp-3 text-text-secondary">{item.summary}</p>}
              </article>
            </li>
          );
        })}
      </ul>

      {filtered.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + NEWS_PAGE_SIZE)}
          className="mt-4 min-h-11 w-full max-w-3xl rounded-lg border border-line-strong font-medium text-text hover:bg-surface"
        >
          Pokaż więcej ({filtered.length - limit})
        </button>
      )}
    </>
  );
}
