import { RETRY_DELAY_MS } from "@/config/limits";
import { useCallback } from "react";
import { isAbortError, createAbortError } from "@/lib/abortUtils";

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
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * 2 ** (attempt - 1)));
        if (signal?.aborted) throw createAbortError();
      }

      try {
        lastResult = await operation();
        lastThrown = undefined;
        if (!hasResultError(lastResult)) return lastResult;
      } catch (err) {
        if (isAbortError(err)) throw err;
        lastThrown = err;
      }
    }

    if (lastThrown !== undefined) throw lastThrown;
    return lastResult as T;
  }, []);
}
