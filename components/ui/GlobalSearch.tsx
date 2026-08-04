// components/ui/GlobalSearch.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Search, Loader2, X } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { GLOBAL_SEARCH_SOURCES, GLOBAL_SEARCH_LIMIT, GLOBAL_SEARCH_MIN_CHARS, type GlobalSearchSource } from "@/config/globalSearch";

interface SearchHit {
  source: GlobalSearchSource;
  id: string;
  label: string;
  sublabel: string;
}

export default function GlobalSearch() {
  const router = useRouter();
  const { supabase, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHits([]);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape") close();
    };
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [close]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const runSearch = useCallback(
    async (term: string) => {
      if (!user || term.trim().length < GLOBAL_SEARCH_MIN_CHARS) {
        setHits([]);
        return;
      }
      setSearching(true);
      const escaped = term.trim().replaceAll("%", "\\%").replaceAll("_", "\\_");
      const pattern = `%${escaped}%`;

      const results = await Promise.all(
        GLOBAL_SEARCH_SOURCES.map(async (source) => {
          const { data } = await supabase
            .from(source.table)
            .select(source.select)
            .ilike(source.searchColumn, pattern)
            .limit(GLOBAL_SEARCH_LIMIT);
          return ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
            source,
            id: String(row.id),
            label: String(row[source.labelColumn] ?? ""),
            sublabel: source.sublabelColumn ? String(row[source.sublabelColumn] ?? "") : "",
          }));
        })
      );
      setHits(results.flat());
      setSearching(false);
    },
    [supabase, user]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void runSearch(query), 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  const grouped = useMemo(() => {
    const map = new Map<string, SearchHit[]>();
    for (const hit of hits) {
      map.set(hit.source.label, [...(map.get(hit.source.label) ?? []), hit]);
    }
    return [...map.entries()];
  }, [hits]);

  const goTo = (hit: SearchHit) => {
    close();
    void router.push(hit.source.href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Szukaj w aplikacji (Ctrl+K)"
        title="Szukaj (Ctrl+K)"
        className="p-2.5 rounded-xl bg-surface hover:bg-surfaceHover text-textSecondary hover:text-text transition-colors active:scale-[0.98]"
      >
        <Search className="w-5 h-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-[12vh] px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Wyszukiwarka globalna"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="card w-full max-w-lg rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <Search className="w-4 h-4 text-textMuted shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Szukaj zadań, notatek, wydarzeń, pism, osób…"
                className="flex-1 min-w-0 bg-transparent text-sm text-text outline-none placeholder:text-textMuted"
              />
              {searching && <Loader2 className="w-4 h-4 animate-spin text-textMuted shrink-0" aria-hidden="true" />}
              <button type="button" onClick={close} aria-label="Zamknij" className="text-textMuted hover:text-text">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto">
              {query.trim().length >= GLOBAL_SEARCH_MIN_CHARS && !searching && hits.length === 0 && (
                <p className="px-4 py-6 text-sm text-textMuted text-center">Brak wyników.</p>
              )}
              {grouped.map(([groupLabel, groupHits]) => (
                <div key={groupLabel} className="py-1">
                  <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-textMuted">
                    {groupLabel}
                  </p>
                  {groupHits.map((hit) => (
                    <button
                      key={`${hit.source.table}-${hit.id}`}
                      type="button"
                      onClick={() => goTo(hit)}
                      className="w-full text-left px-4 py-2 hover:bg-surfaceHover transition-colors"
                    >
                      <span className="block text-sm text-text truncate">{hit.label}</span>
                      {hit.sublabel && (
                        <span className="block text-xs text-textMuted truncate">{hit.sublabel}</span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}