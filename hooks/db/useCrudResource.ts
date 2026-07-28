// hooks/db/useCrudResource.ts
//
// Generyczna fabryka hooków CRUD dla zasobów Supabase. Jedna implementacja
// wzorca, który był powielony w ~15 hookach (5,4 tys. linii łącznie):
// stan raw+fetching+loading, fetch z retry+toastem, optymistyczne add
// z tempId i rollbackiem, edit/delete ze snapshotem `previous`.
//
// Hooki domenowe (useMovies, useNotes, ...) stają się cienkimi adapterami:
// konfiguracja + nazwy publicznego API + logika domenowa (sortowania,
// memo, operacje pochodne). Ich PUBLICZNE API pozostaje identyczne —
// komponenty nie wymagają żadnych zmian.
//
// Fabryka wnosi też jednolicie ulepszenia wypracowane wcześniej w useTasks:
//  - stabilne callbacki mutacji (rollback przez ref, nie przez domknięcie
//    na items) => React.memo w komponentach list znów działa,
//  - ochrona przed race condition w fetchu (numer sekwencyjny),
//  - hydratacja offline z IndexedDB (lib/offlineCache.ts) + persist,
//  - brak fetchu bez zalogowanego użytkownika (poprzednio efekt wołał
//    fetchX(), które rzucało "Unauthorized" => unhandled rejection na
//    każdym mouncie przed logowaniem); mutacje nadal rzucają jak dotąd.

import { useState, useEffect, useCallback, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";
import { useAbortController } from "@/hooks/useAbortController";
import { isAbortError } from "@/lib/abortUtils";
import { readCache, writeCache } from "@/lib/offlineCache";

// Builder zapytania SELECT — typ wyprowadzony z klienta, żeby uniknąć `any`.
type SelectBuilder = ReturnType<ReturnType<SupabaseClient["from"]>["select"]>;

export interface CrudMessages {
  fetchError: string;
  added: string;
  addError: string;
  edited: string;
  editError: string;
  deleted: string;
  deleteError: string;
  confirmDelete: string;
}

export interface CrudResourceConfig<T extends { id: string }, TInsert> {
  table: string;

  /**
   * Zmienne parametry zapytania (np. zakres dat). Zmiana wartości
   * unieważnia refetch i klucz cache offline.
   */
  queryKey?: string;

  /**
   * Filtry/sortowanie fetchu. Domyślnie: .eq('user_id', userId)
   * + opcjonalny `order`. Podanie buildQuery zastępuje CAŁOŚĆ
   * (łącznie z filtrem user_id — dodaj go sam, jeśli potrzebny).
   */
  buildQuery?: (q: SelectBuilder, userId: string) => SelectBuilder;
  order?: { column: string; ascending?: boolean };

  /** Gdzie ląduje wpis optymistyczny. Domyślnie "start". */
  insertPosition?: "start" | "end";

  /** Prefiks klucza cache offline; brak = hydratacja wyłączona. */
  cachePrefix?: string;

  /** Transformacja wiersza z bazy (fetch ORAZ wiersze zwrotne add/edit). */
  transformRow?: (row: unknown) => T;

  /** Payload -> wiersz INSERT. Domyślnie { ...payload, user_id }. */
  prepareInsert?: (payload: TInsert, userId: string) => Record<string, unknown>;

  /** Payload -> wpis optymistyczny. Domyślnie { ...payload, id: tempId, user_id }. */
  buildOptimistic?: (payload: TInsert, tempId: string, userId: string) => T;

  /** Częściowa aktualizacja -> payload UPDATE (np. whitelista kolumn). */
  prepareUpdate?: (updates: Partial<T>) => Record<string, unknown>;

  /** Czy edit ma robić .select().single() i podmienić wpis wierszem z serwera. */
  applyServerRowOnEdit?: boolean;

  messages: CrudMessages;
}

export interface PatchOptions {
  /** Pomiń toast sukcesu (operacje pochodne pokazują własny). */
  silent?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

export function useCrudResource<T extends { id: string }, TInsert = Partial<T>>(
  config: CrudResourceConfig<T, TInsert>
) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const withRetry = useRetry();
  const { getSignal } = useAbortController();

  const [items, setItems] = useState<T[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  // Konfiguracja w ref: adaptery tworzą obiekt configu przy każdym renderze
  // (inline closures), a callbacki mają zostać STABILNE — czytają więc
  // zawsze aktualną wersję przez ref, bez wpisywania configu do deps.
  const configRef = useRef(config);
  configRef.current = config;

  const rollbackRef = useRef<T[]>([]);
  const fetchSeqRef = useRef(0);
  const freshDataRef = useRef(false);

  const queryKey = config.queryKey ?? "";
  const cacheKey =
    config.cachePrefix && userId
      ? `${config.cachePrefix}:${userId}${queryKey ? `:${queryKey}` : ""}`
      : null;

  const transform = useCallback((row: unknown): T => {
    const fn = configRef.current.transformRow;
    return fn ? fn(row) : (row as T);
  }, []);

  const refetch = useCallback(async (): Promise<T[]> => {
    const cfg = configRef.current;
    // Bez użytkownika nie ma czego pobierać — poprzednio hooki rzucały tu
    // "Unauthorized" prosto z useEffect (unhandled rejection przy każdym
    // mouncie przed zalogowaniem).
    if (!userId) return [];

    const seq = ++fetchSeqRef.current;
    // getSignal() przerywa POPRZEDNIE zapytanie tego hooka (np. szybka zmiana
    // dateFrom/dateTo w useTasks) — realna anulacja sieciowa, nie tylko
    // ignorowanie spóźnionej odpowiedzi jak fetchSeqRef (który zostaje jako
    // dodatkowa siatka bezpieczeństwa, gdyby abort nie zdążył przerwać fetchu).
    const signal = getSignal();
    setFetching(true);
    try {
      const { data, error } = await withRetry(async () => {
        const base = supabase.from(cfg.table).select("*");
        let query = cfg.buildQuery
          ? cfg.buildQuery(base, userId)
          : base.eq("user_id", userId);
        if (!cfg.buildQuery && cfg.order) {
          query = query.order(cfg.order.column, {
            ascending: cfg.order.ascending ?? true,
          });
        }
        return query.abortSignal(signal);
      }, signal);
      if (error) throw error;

      const rows = ((data as unknown[]) ?? []).map(transform);

      if (seq === fetchSeqRef.current) {
        freshDataRef.current = true;
        setItems(rows);
        if (cacheKey) void writeCache(cacheKey, rows);
      }
      return rows;
    } catch (err) {
      if (isAbortError(err)) return [];
      if (seq === fetchSeqRef.current) {
        toast.error(cfg.messages.fetchError);
      }
      return [];
    } finally {
      if (seq === fetchSeqRef.current) {
        setFetching(false);
      }
    }
    // queryKey nie jest tu bezpośrednio odwoływane — zmiana parametrów
    // zapytania (np. zakresu dat) przepływa przez cacheKey, który już jest
    // w zależnościach. Osobny wpis queryKey byłby redundantny.
  }, [supabase, userId, toast, withRetry, transform, cacheKey, getSignal]);

  // Hydratacja offline: natychmiastowy render ostatnich znanych danych,
  // dopóki sieć nie odpowie; świeże dane nigdy nie są nadpisywane cachem.
  useEffect(() => {
    if (!cacheKey) return;
    freshDataRef.current = false;
    let cancelled = false;
    void readCache<T[]>(cacheKey).then((cached) => {
      if (cancelled || !cached || freshDataRef.current) return;
      setItems(cached);
    });
    return () => {
      cancelled = true;
    };
  }, [cacheKey]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const add = useCallback(
    async (payload: TInsert): Promise<T | undefined> => {
      const cfg = configRef.current;
      if (!userId) {
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const tempId = `temp-${Date.now()}`;
      const optimistic = cfg.buildOptimistic
        ? cfg.buildOptimistic(payload, tempId, userId)
        : ({ ...(payload as object), id: tempId, user_id: userId } as unknown as T);

      setItems((prev) =>
        (cfg.insertPosition ?? "start") === "start"
          ? [optimistic, ...prev]
          : [...prev, optimistic]
      );

      try {
        const row = cfg.prepareInsert
          ? cfg.prepareInsert(payload, userId)
          : { ...(payload as object), user_id: userId };

        const { data, error } = await withRetry(async () =>
          supabase.from(cfg.table).insert(row).select().single()
        );
        if (error) throw error;

        const created = transform(data);
        setItems((prev) => prev.map((it) => (it.id === tempId ? created : it)));
        toast.success(cfg.messages.added);
        return created;
      } catch {
        setItems((prev) => prev.filter((it) => it.id !== tempId));
        toast.error(cfg.messages.addError);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, toast, withRetry, transform]
  );

  const patch = useCallback(
    async (id: string, updates: Partial<T>, options: PatchOptions = {}): Promise<T | undefined> => {
      const cfg = configRef.current;
      if (!userId) {
        throw new Error("Unauthorized");
      }
      setLoading(true);
      setItems((prev) => {
        rollbackRef.current = prev;
        return prev.map((it) => (it.id === id ? { ...it, ...updates } : it));
      });

      try {
        const payload = cfg.prepareUpdate ? cfg.prepareUpdate(updates) : updates;

        if (cfg.applyServerRowOnEdit) {
          const { data, error } = await withRetry(async () =>
            supabase.from(cfg.table).update(payload).eq("id", id).select().single()
          );
          if (error) throw error;
          const updated = transform(data);
          setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
          if (!options.silent) toast.success(options.successMessage ?? cfg.messages.edited);
          return updated;
        }

        const { error } = await withRetry(async () =>
          supabase.from(cfg.table).update(payload).eq("id", id)
        );
        if (error) throw error;
        if (!options.silent) toast.success(options.successMessage ?? cfg.messages.edited);
        return undefined;
      } catch {
        setItems(rollbackRef.current);
        toast.error(options.errorMessage ?? cfg.messages.editError);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, toast, withRetry, transform]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const cfg = configRef.current;
      if (!userId) {
        throw new Error("Unauthorized");
      }
      const ok = await toast.confirm(cfg.messages.confirmDelete);
      if (!ok) return false;

      setLoading(true);
      setItems((prev) => {
        rollbackRef.current = prev;
        return prev.filter((it) => it.id !== id);
      });

      try {
        const { error } = await withRetry(async () =>
          supabase.from(cfg.table).delete().eq("id", id)
        );
        if (error) throw error;
        toast.success(cfg.messages.deleted);
        return true;
      } catch {
        setItems(rollbackRef.current);
        toast.error(cfg.messages.deleteError);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, toast, withRetry]
  );

  return { items, setItems, fetching, loading, refetch, add, patch, remove };
}
