// config/timing.ts
//
// Czasy po stronie klienta: ponowienia, okna cofania, odświeżanie danych.
// Timeouty i TTL serwera – config/server.ts.

/** Ponowienie nieudanego zapisu do bazy (useRetry). */
export const RETRY_DELAY_MS = 1500;
export const RETRY_MAX_ATTEMPTS = 2;

/** Czas na „Cofnij” po usunięciu zadania. */
export const UNDO_WINDOW_MS = 5000;

/** Opóźnienie wyszukiwania podczas pisania. */
export const SEARCH_DEBOUNCE_MS = 250;

/** Odświeżanie statusu pociągu w planie dnia. */
export const TRAIN_STATUS_REFRESH_MS = 120_000;
/** Jak długo po odjeździe pociąg uznajemy za „w drodze”. */
export const TRAIN_ACTIVE_WINDOW_MS = 6 * 60 * 60 * 1000;
/** Timeout pobierania tablicy odjazdów w przeglądarce. */
export const STATION_BOARD_CLIENT_TIMEOUT_MS = 25_000;
