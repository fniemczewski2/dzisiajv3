// lib/queryClient.ts
//
// Klient TanStack Query – wspólna pamięć podręczna zapytań do bazy.
// W przeglądarce jeden na kartę (komponenty i hooki dzielą dane, zapytania
// o ten sam klucz są wykonywane raz). Na serwerze nowy przy każdym wywołaniu,
// żeby dane różnych osób nigdy nie trafiły do wspólnej pamięci.

import { notifyManager, QueryClient } from "@tanstack/react-query";
import { QUERY_GC_MS, QUERY_STALE_MS } from "@/config/timing";

// Zmiany danych (np. optymistyczne setQueryData) trafiają do komponentów od razu,
// w tej samej partii co zwykły setState – jak przed przejściem na TanStack Query.
// Domyślny harmonogram odkłada powiadomienia o jedno zadanie (setTimeout 0).
notifyManager.setScheduler((callback) => callback());

function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_MS,
        gcTime: QUERY_GC_MS,
        // Ponawianie robi useRetry w funkcjach pobierających (spójnie z zapisami).
        retry: false,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}

let browserClient: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") return createAppQueryClient();
  browserClient ??= createAppQueryClient();
  return browserClient;
}

/** Wylogowanie / zmiana konta – usuwa z pamięci wszystkie dane poprzedniej osoby. */
export function clearQueryCache(): void {
  browserClient?.clear();
}
