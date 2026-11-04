// lib/queryPersister.ts
//
// Zapis pamięci TanStack Query w IndexedDB (jedna warstwa pamięci podręcznej
// zamiast osobnej kopii list). Po ponownym otwarciu aplikacji – także bez
// sieci – widoki pokazują ostatnio pobrane dane, a w tle pobierają świeże.
// Całość jest usuwana przy wylogowaniu i zmianie konta (lib/localUserData.ts).

import type { Query } from "@tanstack/react-query";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { clearOfflineCache, readCache, writeCache } from "@/lib/offlineCache";
import { QUERY_PERSIST_THROTTLE_MS } from "@/config/timing";

const STORAGE_KEY = "tanstack-query";

/**
 * Zapytania o danych „na żywo” (odjazdy, status pociągu, podpowiedzi) nie są
 * zapisywane – po ponownym uruchomieniu i tak byłyby nieaktualne.
 */
const NOT_PERSISTED = new Set([
  // Treść poczty: tylko w pamięci (polityka prywatności – treść wiadomości nie jest zapisywana).
  "mail",
  // Zapisy uczestników ankiet (imiona, e-maile) i zajętość slotów – tylko w pamięci.
  "meeting-poll-bookings",
  "public-signup-slots",
  // Dane o zdrowiu (art. 9 RODO): tylko w pamięci, bez zapisu w przeglądarce.
  "health-daily",
  "health-workouts",
  "health-heart-rate",
  "health-sleep",
  "nearby-departures",
  "favorite-departures",
  "station-board",
  "train-status",
  "stop-suggestions",
  "public-poll",
  "public-poll-response",
]);

export function shouldPersistQuery(query: Query): boolean {
  return query.state.status === "success" && !NOT_PERSISTED.has(String(query.queryKey[0]));
}

let pending: PersistedClient | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

export const queryPersister: Persister = {
  // Zapis najwyżej raz na QUERY_PERSIST_THROTTLE_MS – ostatni stan wygrywa.
  persistClient(client) {
    pending = client;
    timer ??= setTimeout(() => {
      timer = null;
      const snapshot = pending;
      pending = null;
      if (snapshot) void writeCache(STORAGE_KEY, snapshot);
    }, QUERY_PERSIST_THROTTLE_MS);
  },
  async restoreClient() {
    return (await readCache<PersistedClient>(STORAGE_KEY)) ?? undefined;
  },
  async removeClient() {
    if (timer) clearTimeout(timer);
    timer = null;
    pending = null;
    await clearOfflineCache();
  },
};
