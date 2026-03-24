// lib/withRetry.ts

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

async function logErrorToEdgeFunction(
  error: unknown,
  context: string,
  userId?: string,
  supabase?: SupabaseClient
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; // Zmiana na PUBLISHABLE_KEY

  if (!supabaseUrl || !publishableKey) {
    console.error("[withRetry] Missing Supabase env vars — cannot log error");
    return;
  }

  let jwt = publishableKey;
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        jwt = data.session.access_token;
      }
    } catch {
    }
  }

  try {
    await fetch(`${supabaseUrl}/functions/v1/log-error`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${jwt}`,
        "apikey":        publishableKey, // Przekazujemy nowy klucz publishable
      },
      body: JSON.stringify({
        context,
        userId:  userId ?? null,
        message: error instanceof Error ? error.message : String(error),
        stack:   error instanceof Error ? (error.stack ?? null) : null,
      }),
    });
  } catch (fetchError) {
    console.error("[withRetry] Failed to log error:", fetchError);
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  toast: ToastHandle,
  options: WithRetryOptions
): Promise<T> {
  const { context, userId, supabase, retryDelay = RETRY_DELAY_MS } = options;

  try {
    return await operation();
  } catch (firstError) {
    toast.error("Wystąpił błąd. System automatycznie próbuje ponownie…");
    console.warn(`[withRetry] First attempt failed (${context}):`, firstError);

    await new Promise((resolve) => setTimeout(resolve, retryDelay));

    try {
      return await operation();
    } catch (secondError) {
      toast.error("Wystąpił nieoczekiwany błąd. Powiadom administratora.");
      console.error(`[withRetry] Retry failed (${context}):`, secondError);
      await logErrorToEdgeFunction(secondError, context, userId, supabase);
      throw secondError;
    }
  }
}