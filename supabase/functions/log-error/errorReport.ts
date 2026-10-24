// lib/errorReport.ts
//
// Wysyła błędy aplikacji do tabeli `errors` przez Edge Function `log-error`.
// Działa poza kontekstem React (także w ErrorBoundary i globalnych handlerach).
// Raportowanie nigdy nie zgłasza własnych błędów i nie zapętla się: funkcja nie raportuje
// swoich wywołań, a klient wysyła każdy unikalny błąd tylko raz na ładowanie strony.

import { createClient } from "@/lib/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";

/** Maksymalnie tyle zgłoszeń na jedno ładowanie strony (serwer dodatkowo ma limit na konto). */
export const MAX_REPORTS_PER_PAGE = 10;

/** Szum przeglądarki, który nie jest błędem aplikacji. */
const IGNORED_MESSAGES = [/ResizeObserver loop/i];

const sentKeys = new Set<string>();
let sentCount = 0;

export function errorMessageOf(value: unknown): string {
  if (value instanceof Error) return value.message || value.name;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/** Usuwa adresy e-mail z treści, zanim trafią do bazy (wiadomości błędów nie mogą nieść danych osobowych). */
export function redactMessage(message: string): string {
  return message.replaceAll(/[^\s@"'<>]+@[^\s@"'<>]+/g, "[email]").slice(0, 2000);
}

export async function reportError(context: string, value: unknown): Promise<void> {
  try {
    const message = redactMessage(errorMessageOf(value).trim());
    if (!message || IGNORED_MESSAGES.some((re) => re.test(message))) return;

    const key = `${context}|${message}`;
    if (sentKeys.has(key) || sentCount >= MAX_REPORTS_PER_PAGE) return;
    sentKeys.add(key);
    sentCount++;

    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session) return; // funkcja wymaga zalogowania; błąd przed logowaniem zostaje tylko w konsoli

    const stack = value instanceof Error && value.stack ? redactMessage(value.stack) : null;
    const res = await invokeEdgeFunction(supabase, "log-error", { context, message, stack });
    if (!res.ok && res.status !== 429) console.warn("[errorReport] nie zapisano błędu:", res.status);
  } catch {
    // Celowo bez akcji: raportowanie błędów nie może generować kolejnych błędów.
  }
}
