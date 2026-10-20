// providers/QueryProvider.tsx
//
// TanStack Query z zapisem pamięci w IndexedDB (lib/queryPersister.ts).
// `buster` = wersja aplikacji: po wdrożeniu nowej wersji stary zapis jest pomijany.

import type { ReactNode } from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { getQueryClient } from "@/lib/queryClient";
import { queryPersister, shouldPersistQuery } from "@/lib/queryPersister";
import { QUERY_PERSIST_MAX_AGE_MS } from "@/config/timing";
import { publicEnv } from "@/config/env";

export function QueryProvider({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <PersistQueryClientProvider
      client={getQueryClient()}
      persistOptions={{
        persister: queryPersister,
        maxAge: QUERY_PERSIST_MAX_AGE_MS,
        buster: publicEnv.appVersion,
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
