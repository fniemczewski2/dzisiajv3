import { RETRY_DELAY_MS } from "@/config/limits";
import { useCallback } from "react";

export function useRetry() {
  return useCallback(async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));

      try {
        return await operation();
      } catch (secondError) {
        throw secondError;
      }
    }
  }, []);
}
