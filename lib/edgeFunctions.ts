// lib/edgeFunctions.ts
//
// Jedno miejsce wywoływania Edge Functions z przeglądarki: zawsze przez
// `supabase.functions.invoke` (adres projektu, klucz publiczny i token sesji
// dokleja klient Supabase). Wynik ujednolicony – status HTTP i treść odpowiedzi
// także przy błędzie, żeby komponenty mogły pokazać konkretny komunikat.

import { FunctionsFetchError, FunctionsHttpError, type SupabaseClient } from "@supabase/supabase-js";

export type EdgeFunctionName = "send-love" | "send-push" | "transport-departures";

export type EdgeFunctionResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number | null; data: Record<string, unknown> | null; networkError: boolean };

export async function invokeEdgeFunction<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  name: EdgeFunctionName,
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<EdgeFunctionResult<T>> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body, signal });
  if (!error) return { ok: true, status: 200, data: data as T };

  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response;
    const parsed = (await response
      .clone()
      .json()
      .catch(() => null)) as Record<string, unknown> | null;
    return { ok: false, status: response.status, data: parsed, networkError: false };
  }
  return { ok: false, status: null, data: null, networkError: error instanceof FunctionsFetchError };
}
