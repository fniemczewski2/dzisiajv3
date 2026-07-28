import { RETRY_DELAY_MS } from "@/config/limits";
import { useCallback } from "react";
import { isAbortError, createAbortError } from "@/lib/abortUtils";

// Czy wynik operacji to odpowiedź w stylu Supabase ({ data, error }) z błędem?
// Klient Supabase NIE rzuca wyjątków przy błędach zapytań — zwraca { error }.
// Poprzednia wersja retry'owała tylko rzucone wyjątki (błędy sieciowe fetch),
// więc np. chwilowe 5xx z PostgREST nigdy nie było ponawiane.
function hasResultError(result: unknown): boolean {
  return (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    (result as { error: unknown }).error != null
  );
}

const MAX_ATTEMPTS = 2;

export function useRetry() {
  return useCallback(async function withRetry<T>(
    operation: () => Promise<T>,
    signal?: AbortSignal
  ): Promise<T> {
    let lastResult: T | undefined;
    let lastThrown: unknown;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (signal?.aborted) throw createAbortError();

      if (attempt > 0) {
        // Backoff wykładniczy zamiast stałego opóźnienia.
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * 2 ** (attempt - 1)));
        // Sygnał mógł zostać przerwany W TRAKCIE oczekiwania na backoff.
        if (signal?.aborted) throw createAbortError();
      }

      try {
        lastResult = await operation();
        lastThrown = undefined;
        if (!hasResultError(lastResult)) return lastResult;
        // Wynik z { error } — ponawiamy; przy insert/update jest to bezpieczne,
        // bo obecność error oznacza, że operacja się NIE powiodła.
      } catch (err) {
        // Żądanie przerwane celowo (unmount / nowszy fetch nadpisał ten) —
        // nie ma sensu ponawiać czegoś, co i tak zostanie odrzucone.
        if (isAbortError(err)) throw err;
        lastThrown = err;
      }
    }

    if (lastThrown !== undefined) throw lastThrown;
    return lastResult as T;
  }, []);
}
