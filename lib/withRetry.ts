// lib/withRetry.ts

export interface WithRetryOptions {
  context: string;
  userId?: string;
  retryDelay?: number;
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
  userId?: string
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error("[withRetry] brak zmiennych środowiskowych Supabase");
    return;
  }

  let jwt = anonKey;
  try {
    const stored = localStorage.getItem(
      `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`
    );
    if (stored) {
      const parsed = JSON.parse(stored);
      jwt = parsed?.access_token ?? anonKey;
    }
  } catch {
    // localStorage niedostępny (SSR) — użyj anon key
  }

  try {
    await fetch(`${supabaseUrl}/functions/v1/log-error`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${jwt}`,
        "apikey":        anonKey,
      },
      body: JSON.stringify({
        context,
        userId:  userId ?? null,
        message: error instanceof Error ? error.message : String(error),
        stack:   error instanceof Error ? (error.stack ?? null) : null,
      }),
    });
  } catch (fetchError) {
    // Logowanie nie może crashować aplikacji
    console.error("[withRetry] nie udało się zalogować błędu:", fetchError);
  }
}


export async function withRetry<T>(
  operation: () => Promise<T>,
  toast: ToastHandle,
  options: WithRetryOptions
): Promise<T> {
  const { context, userId, retryDelay = RETRY_DELAY_MS } = options;

  try {
    return await operation();
  } catch (firstError) {
    toast.error("Wystąpił błąd. System automatycznie próbuje ponownie…");
    console.warn(`[withRetry] pierwsza próba nieudana (${context}):`, firstError);

    await new Promise((resolve) => setTimeout(resolve, retryDelay));

    try {
      return await operation();
    } catch (secondError) {
      toast.error("Wystąpił nieoczekiwany błąd. Powiadom administratora.");
      console.error(`[withRetry] retry nieudany (${context}):`, secondError);
      await logErrorToEdgeFunction(secondError, context, userId);
      throw secondError;
    }
  }
}