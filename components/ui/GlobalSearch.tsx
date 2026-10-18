// components/ui/GlobalSearch.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Search, Loader2, X } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import Modal from "./Modal";
import { useEnabledModules } from "@/hooks/useEnabledModules";
import {
  GLOBAL_SEARCH_SOURCES,
  GLOBAL_SEARCH_LIMIT,
  GLOBAL_SEARCH_MIN_CHARS,
  type GlobalSearchSource,
} from "@/config/globalSearch";

interface SearchHit {
  source: GlobalSearchSource;
  id: string;
  label: string;
  sublabel: string;
}

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
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
  // Wyłączone moduły nie pojawiają się w wynikach (ref – bez przebudowy wyszukiwania).
  const { isEnabled } = useEnabledModules();
  const isEnabledRef = useRef(isEnabled);
  useEffect(() => {
    isEnabledRef.current = isEnabled;
  }, [isEnabled]);

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
      const escaped = term
        .trim()
        .replaceAll("%", String.raw`\%`)
        .replaceAll("_", String.raw`\_`);
      const pattern = `%${escaped}%`;

      const results = await Promise.all(
        GLOBAL_SEARCH_SOURCES.filter((source) => isEnabledRef.current(source.href)).map(async (source) => {
          const { data } = await supabase
            .from(source.table)
            .select(source.select)
            .ilike(source.searchColumn, pattern)
            .limit(GLOBAL_SEARCH_LIMIT);
          return ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
            source,
            id: stringifyCell(row.id),
            label: stringifyCell(row[source.labelColumn]),
            sublabel: source.sublabelColumn ? stringifyCell(row[source.sublabelColumn]) : "",
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
        title="Szukaj"
        className="rounded-xl bg-surface p-2.5 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text active:scale-[0.98]"
      >
        <Search className="h-5 w-5" />
      </button>

      <Modal open={open} onClose={close} label="Wyszukiwarka globalna" className="mt-[12vh]">
        <div className="card w-full max-w-lg overflow-hidden rounded-card shadow-xl">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szukaj zadań, notatek, wydarzeń, pism, osób…"
              aria-label="Szukaj w aplikacji"
              className="min-w-0 flex-1 rounded bg-transparent text-base text-text outline-none placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-primary"
            />
            {searching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-text-muted" aria-hidden="true" />}
            <button type="button" onClick={close} aria-label="Zamknij" className="text-text-muted hover:text-text">
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[50vh] overflow-y-auto">
            {query.trim().length >= GLOBAL_SEARCH_MIN_CHARS && !searching && hits.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-text-muted">Brak wyników.</p>
            )}
            {grouped.map(([groupLabel, groupHits]) => (
              <div key={groupLabel} className="py-1">
                <p className="px-4 py-1 text-xs font-bold text-text-muted">{groupLabel}</p>
                {groupHits.map((hit) => (
                  <button
                    key={`${hit.source.table}-${hit.id}`}
                    type="button"
                    onClick={() => goTo(hit)}
                    className="w-full px-4 py-2 text-left transition-colors hover:bg-surface-hover"
                  >
                    <span className="block truncate text-sm text-text">{hit.label}</span>
                    {hit.sublabel && <span className="block truncate text-xs text-text-muted">{hit.sublabel}</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
