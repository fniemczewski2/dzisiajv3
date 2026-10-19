// hooks/useQueryState.ts
//
// Dane z bazy przez TanStack Query z możliwością lokalnych (optymistycznych)
// zmian: `setData` zapisuje wprost do pamięci zapytania, więc wszystkie
// komponenty z tym samym kluczem widzą zmianę od razu. Zastępuje wzorzec
// useState + pobieranie w useEffect.

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";

export type DataUpdater<T> = T | ((prev: T) => T);

interface Options<T> {
  /** Uwaga: `initial` powinno być stałą (np. pustą tablicą zdefiniowaną poza komponentem). */
  queryKey: QueryKey;
  queryFn: (context: { signal: AbortSignal }) => Promise<T>;
  /** Wartość, gdy danych jeszcze nie ma (lub zapytanie jest wyłączone). */
  initial: T;
  enabled?: boolean;
}

export function useQueryState<T>({ queryKey, queryFn, initial, enabled = true }: Options<T>) {
  const queryClient = useQueryClient();
  const keyHash = JSON.stringify(queryKey);
  // Stabilna tożsamość klucza między renderami (tablice są tworzone na nowo).
  const stableKey = useMemo(() => JSON.parse(keyHash) as QueryKey, [keyHash]);

  const query = useQuery({ queryKey: stableKey, queryFn: ({ signal }) => queryFn({ signal }), enabled });

  const setData = useCallback(
    (updater: DataUpdater<T>) => {
      queryClient.setQueryData<T>(stableKey, (prev) =>
        typeof updater === "function" ? (updater as (p: T) => T)(prev ?? initial) : updater
      );
    },
    [queryClient, stableKey, initial]
  );

  const refetch = useCallback(async () => {
    const result = await query.refetch();
    return result.data ?? initial;
  }, [query, initial]);

  return {
    data: query.data ?? initial,
    setData,
    /** Pierwsze wczytanie (skeleton). */
    fetching: enabled && query.isPending,
    error: query.error,
    refetch,
  };
}
