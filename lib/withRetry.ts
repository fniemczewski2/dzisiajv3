const RETRY_DELAY_MS = 1500;

export function useRetry() {
  return async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
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
  };
}
