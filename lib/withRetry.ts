import { useToast } from "@/providers/ToastProvider";

const RETRY_DELAY_MS = 1500;

export function useRetry() {
  const { toast } = useToast();
  return async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch {
      toast.error("Wystąpił błąd. System próbuje ponownie…");
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));

      try {
        return await operation();
      } catch (secondError) {
        toast.error("Wystąpił błąd. Powiadom administratora.");
        throw secondError;
      }
    }
  };
}
