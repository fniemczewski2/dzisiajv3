// supabase/functions/_shared/config.ts
//
// Limity i ustawienia funkcji Edge (Deno). Pliki z config/ są poza bundlem funkcji,
// dlatego wartości używane także w aplikacji (np. limity powtarzania) importuje ona przez alias @/shared/config.

/** Reguły powtarzania wydarzeń/zadań. */
export const MAX_INTERVAL = 99;
export const MAX_COUNT = 500;
/** Bezpiecznik pętli – żadna reguła nie przejdzie więcej kroków. */
export const MAX_STEPS = 20_000;

/** Powiadomienia o współdzieleniu: długość tytułu w treści powiadomienia. */
export const MAX_SHARED_NOTIFY_TEXT = 120;

/** log-error: limity długości pól zgłoszenia. */
export const MAX_ERROR_CONTEXT = 255;
export const MAX_ERROR_MESSAGE = 2000;
export const MAX_ERROR_STACK = 5000;

/** transport-departures. */
export const MAX_MINUTES_AHEAD = 60;
export const MAX_NEARBY_GROUPS = 4;
export const MAX_FAVORITE_STOPS = 10;

/** Dozwolone originy CORS, gdy nie ustawiono ALLOWED_ORIGIN. */
export const DEFAULT_ORIGINS = ["https://dzisiaj.fun", "https://www.dzisiaj.fun"];
