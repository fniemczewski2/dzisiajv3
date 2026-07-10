// lib/withRetry.ts

import { useToast } from "@/providers/ToastProvider";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface WithRetryOptions {
  context: string;
  userId?: string;
  retryDelay?: number;
  supabase?: SupabaseClient;
}

type ToastHandle = {
  error:   (message: string) => void;
  success: (message: string) => void;
  info:    (message: string) => void;
};

const RETRY_DELAY_MS = 1500;

export async function withRetry<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const { toast } = useToast()
  try {
    return await operation();
  } catch (firstError) {
    toast.error("Wystąpił błąd. System próbuje ponownie…");
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));

    try {
      return await operation();
    } catch (secondError) {
      toast.error("Wystąpił błąd. Powiadom administratora.");
      throw secondError;
    }
  }
}