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
/** Timeout pobierania tablicy odjazdów w przeglądarce. */
export const STATION_BOARD_CLIENT_TIMEOUT_MS = 25_000;

/** Po wysłaniu serduszka przycisk jest nieaktywny przez tyle czasu. */
export const LOVE_COOLDOWN_MS = 60_000;

/** Ikona „skopiowano” po skopiowaniu tekstu. */
export const COPY_FEEDBACK_MS = 2000;

/** Opóźnienie sprawdzania dostępności publicznego adresu wizytówki podczas pisania. */
export const SLUG_CHECK_DEBOUNCE_MS = 500;

/** Odświeżanie godziny w kafelku pociągu w planie dnia. */
export const TRAIN_PLAN_TICK_MS = 30_000;

/** TanStack Query: po tylu ms dane uznajemy za nieaktualne (ponowne pobranie przy kolejnym użyciu). */
export const QUERY_STALE_MS = 60_000;
/** TanStack Query: nieużywane dane zostają w pamięci tyle ms (≥ czas ważności zapisu w IndexedDB). */
export const QUERY_GC_MS = 24 * 60 * 60_000;
/** Zapisana w IndexedDB pamięć zapytań jest ważna tyle ms (starsza jest pomijana). */
export const QUERY_PERSIST_MAX_AGE_MS = 24 * 60 * 60_000;
/** Zapis pamięci zapytań do IndexedDB najwyżej raz na tyle ms. */
export const QUERY_PERSIST_THROTTLE_MS = 1000;

/** Transport: odświeżanie odjazdów w pobliżu i z ulubionych przystanków (gdy włączone). */
export const NEARBY_REFRESH_MS = 30_000;
/** Transport: ponowne wejście w tym czasie nie odpytuje serwera o ulubione. */
export const FAVORITES_MIN_INTERVAL_MS = 5000;
/** Transport: opóźnienie podpowiedzi przystanków podczas pisania. */
export const SUGGESTIONS_DEBOUNCE_MS = 300;

/** Pogoda: dane są świeże przez ten czas (ponowne wejście nie odpytuje Open-Meteo). */
export const WEATHER_STALE_MS = 15 * 60_000;

/** Tablica odjazdów PKP: dane świeże przez ten czas (przycisk „Odśwież” pobiera od razu). */
export const STATION_BOARD_STALE_MS = 60_000;

/** Kolizje terminów: sprawdzenie po tylu ms od ostatniej zmiany godzin w formularzu. */
export const CONFLICT_CHECK_DEBOUNCE_MS = 300;
/** Pobrany plik: adres obiektu (blob URL) zwalniamy po tylu ms od rozpoczęcia pobierania. */
export const DOWNLOAD_URL_REVOKE_MS = 1000;
