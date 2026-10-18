// hooks/useRetry.ts

import { RETRY_DELAY_MS, RETRY_MAX_ATTEMPTS } from "@/config/timing";
import { useCallback } from "react";
import { isAbortError, createAbortError } from "@/lib/abortUtils";

function hasResultError(result: unknown): boolean {
  return (
    typeof result === "object" && result !== null && "error" in result && (result as { error: unknown }).error != null
  );
}

async function waitBeforeRetry(attempt: number, signal?: AbortSignal): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * 2 ** (attempt - 1)));
  if (signal?.aborted) throw createAbortError();
}

export function useRetry() {
  return useCallback(async function withRetry<T>(operation: () => PromiseLike<T>, signal?: AbortSignal): Promise<T> {
    let lastResult: T | undefined;
    let lastThrown: unknown;

    for (let attempt = 0; attempt < RETRY_MAX_ATTEMPTS; attempt++) {
      if (signal?.aborted) throw createAbortError();
      if (attempt > 0) await waitBeforeRetry(attempt, signal); // NOSONAR

      try {
        lastResult = await operation(); // NOSONAR
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
