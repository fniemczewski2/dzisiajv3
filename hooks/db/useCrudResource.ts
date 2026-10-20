// hooks/db/useCrudResource.ts

import { useQueryState } from "@/hooks/useQueryState";
import { NotSignedInError } from "@/lib/errors";
import { useState, useCallback, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";
import { useLatestRef } from "@/hooks/useLatestRef";
import { isAbortError } from "@/lib/abortUtils";

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
  queryKey?: string;
  buildQuery?: (q: SelectBuilder, userId: string) => SelectBuilder;
  order?: { column: string; ascending?: boolean };
  insertPosition?: "start" | "end";
  transformRow?: (row: unknown) => T;
  prepareInsert?: (payload: TInsert, userId: string) => Record<string, unknown>;
  buildOptimistic?: (payload: TInsert, tempId: string, userId: string) => T;
  prepareUpdate?: (updates: Partial<T>) => Record<string, unknown>;
  applyServerRowOnEdit?: boolean;
  messages: CrudMessages;
  /**
   * Komunikat dla konkretnego błędu bazy (np. naruszenie unikalności 23505).
   * Brak wyniku = komunikat ogólny z `messages`.
   */
  describeError?: (error: unknown, action: "add" | "edit" | "delete") => string | undefined;
}

export interface PatchOptions {
  silent?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

/** Stała pusta lista – stabilna tożsamość dla useQueryState. */
const EMPTY: never[] = [];

export function useCrudResource<T extends { id: string }, TInsert extends object = Partial<T>>(
  config: CrudResourceConfig<T, TInsert>
) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const withRetry = useRetry();

  const [loading, setLoading] = useState(false);
  const configRef = useLatestRef(config);

  const rollbackRef = useRef<T[]>([]);

  const queryKey = config.queryKey ?? "";

  const transform = useCallback(
    (row: unknown): T => {
      const fn = configRef.current.transformRow;
      return fn ? fn(row) : (row as T);
    },
    [configRef]
  );

  // Pobranie przez TanStack Query: komponenty z tym samym kluczem dzielą jedno zapytanie
  // i pamięć. Bez sieci – ostatnia kopia z IndexedDB (lib/offlineCache.ts).
  const fetchRows = useCallback(
    async ({ signal }: { signal: AbortSignal }): Promise<T[]> => {
      const cfg = configRef.current;
      if (!userId) return [];
      try {
        const { data, error } = await withRetry(() => {
          const base = supabase.from(cfg.table).select("*");
          let query = cfg.buildQuery ? cfg.buildQuery(base, userId) : base.eq("user_id", userId);
          if (!cfg.buildQuery && cfg.order) {
            query = query.order(cfg.order.column, {
              ascending: cfg.order.ascending ?? true,
            });
          }
          return query.abortSignal(signal);
        }, signal);
        if (error) throw error;

        const rows = ((data as unknown[]) ?? []).map((row) => transform(row));
        return rows;
      } catch (err) {
        // Bez sieci widok zostaje przy danych z pamięci (także odtworzonych z IndexedDB).
        if (!isAbortError(err)) toast.error(cfg.messages.fetchError);
        throw err;
      }
    },
    [supabase, userId, toast, withRetry, transform, configRef]
  );

  const {
    data: items,
    setData: setItems,
    fetching,
    refetch,
  } = useQueryState<T[]>({
    queryKey: ["crud", config.table, userId ?? null, queryKey],
    queryFn: fetchRows,
    initial: EMPTY as T[],
    enabled: Boolean(userId),
  });

  const add = useCallback(
    async (payload: TInsert): Promise<T | undefined> => {
      const cfg = configRef.current;
      if (!userId) {
        throw new NotSignedInError();
      }
      setLoading(true);
      const tempId = `temp-${Date.now()}`;
      const optimistic = cfg.buildOptimistic
        ? cfg.buildOptimistic(payload, tempId, userId)
        : ({ ...payload, id: tempId, user_id: userId } as unknown as T);

      setItems((prev) => ((cfg.insertPosition ?? "start") === "start" ? [optimistic, ...prev] : [...prev, optimistic]));

      try {
        const row = cfg.prepareInsert ? cfg.prepareInsert(payload, userId) : { ...payload, user_id: userId };

        const { data, error } = await withRetry(() => supabase.from(cfg.table).insert(row).select().single());
        if (error) throw error;

        const created = transform(data);
        setItems((prev) => prev.map((it) => (it.id === tempId ? created : it)));
        toast.success(cfg.messages.added);
        return created;
      } catch (error) {
        setItems((prev) => prev.filter((it) => it.id !== tempId));
        toast.error(cfg.describeError?.(error, "add") ?? cfg.messages.addError);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, toast, withRetry, transform, configRef, setItems]
  );

  const patch = useCallback(
    async (id: string, updates: Partial<T>, options: PatchOptions = {}): Promise<T | undefined> => {
      const cfg = configRef.current;
      if (!userId) {
        throw new NotSignedInError();
      }
      setLoading(true);
      setItems((prev) => {
        rollbackRef.current = prev;
        return prev.map((it) => (it.id === id ? { ...it, ...updates } : it));
      });

      try {
        const payload = cfg.prepareUpdate ? cfg.prepareUpdate(updates) : updates;

        if (cfg.applyServerRowOnEdit) {
          const { data, error } = await withRetry(() =>
            supabase.from(cfg.table).update(payload).eq("id", id).select().single()
          );
          if (error) throw error;
          const updated = transform(data);
          setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
          if (!options.silent) toast.success(options.successMessage ?? cfg.messages.edited);
          return updated;
        }

        const { error } = await withRetry(() => supabase.from(cfg.table).update(payload).eq("id", id));
        if (error) throw error;
        if (!options.silent) toast.success(options.successMessage ?? cfg.messages.edited);
        return undefined;
      } catch (error) {
        setItems(rollbackRef.current);
        toast.error(options.errorMessage ?? cfg.describeError?.(error, "edit") ?? cfg.messages.editError);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, toast, withRetry, transform, configRef, setItems]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const cfg = configRef.current;
      if (!userId) {
        throw new NotSignedInError();
      }
      const ok = await toast.confirm(cfg.messages.confirmDelete);
      if (!ok) return false;

      setLoading(true);
      setItems((prev) => {
        rollbackRef.current = prev;
        return prev.filter((it) => it.id !== id);
      });

      try {
        const { error } = await withRetry(() => supabase.from(cfg.table).delete().eq("id", id));
        if (error) throw error;
        toast.success(cfg.messages.deleted);
        return true;
      } catch (error) {
        setItems(rollbackRef.current);
        toast.error(cfg.describeError?.(error, "delete") ?? cfg.messages.deleteError);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, toast, withRetry, configRef, setItems]
  );

  return { items, setItems, fetching, loading, refetch, add, patch, remove };
}
