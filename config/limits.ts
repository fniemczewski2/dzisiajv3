// config/limits.ts
//
// Limity danych i interfejsu widoczne dla użytkownika (ile czegoś można mieć,
// jak duży może być plik, ile pozycji pokazać). Limity zapytań, timeouty
// serwera i paginacja – config/server.ts; czasy po stronie klienta –
// config/timing.ts; wartości domyślne – config/defaults.ts.
//
// Limity, które musi pilnować baza (triggery), są oznaczone „[baza]” – zmiana
// tutaj wymaga zmiany funkcji w Supabase.

// --- Listy i kolekcje -------------------------------------------------------
export const MAX_SHOPPING_LISTS = 5;
export const MAX_FAVORITE_STOPS = 10;
export const MAX_TRUSTED_USERS = 10;
/** Kategorie budżetu na rok. */
export const MAX_CATEGORIES = 20;
export const MAX_RECIPE_PRODUCTS = 100;
/** Własne nawyki dzienne. */
export const MAX_HABITS = 8;
/** Własne nastroje (moduł nastroju). */
export const MAX_MOODS = 10;
/** [baza] Wizytówki na konto. */
export const MAX_VCARD_PROFILES = 5;

// --- Wyszukiwanie -----------------------------------------------------------
export const MAX_SEARCH_HISTORY = 5;
export const MAX_SEARCH_SUGGESTIONS = 5;
export const TRANSPORT_SUGGESTIONS_LIMIT = 10;
/** Maksymalnie tyle przystanków pobieramy przy wyszukiwaniu po nazwie. */
export const TRANSPORT_STOP_SEARCH_LIMIT = 300;
/** Liczba odjazdów z jednego przystanku. */
export const TRANSPORT_DEPARTURES_LIMIT = 30;
/** Tablice odjazdów PKP obserwowane jednocześnie. */
export const MAX_TRACKED_STATIONS = 3;

// --- Pliki ------------------------------------------------------------------
export const MAX_LETTER_PDF_SIZE_MB = 10;
export const TICKET_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const TICKET_ALLOWED_MIME = "application/pdf";
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const REPORT_TEMPLATE_MAX_FONT_BYTES = 2 * 1024 * 1024;
export const REPORT_TEMPLATE_MAX_LOGO_BYTES = 5 * 1024 * 1024;

// --- Teksty -----------------------------------------------------------------
export const MAX_TITLE_LENGTH = 200;
export const MAX_PLACE_LENGTH = 200;
/** [baza] Długość jednej szybkiej notatki. */
export const MAX_QUICK_NOTE_LENGTH = 500;
/** Ile punktów można dodać jednym zapisem (np. ze Skrótów Siri). */
export const MAX_QUICK_NOTES_PER_SUBMIT = 20;
/** Notatka dłuższa niż to jest pokazywana jako zwykły tekst, bez formatowania. */
export const NOTE_FORMATTING_MAX_LENGTH = 5000;

// --- Ankiety terminów -------------------------------------------------------
export const MAX_RESPONDENT_NAME_LENGTH = 100;
export const MAX_SLOTS_PER_RESPONSE = 500;
export const MAX_SLOTS_PER_FINALIZE = 20;

// --- Kalendarz i zadania ----------------------------------------------------
/** Najdłuższe wydarzenie z importu zbiorczego. */
export const MAX_EVENT_SPAN_DAYS = 31;
/** Najdłuższy zjazd rozpoznawany w harmonogramie uczelni. */
export const MAX_STUDY_SESSION_SPAN_DAYS = 4;
/** Górna granica wystąpień jednego zadania cyklicznego w podglądzie. */
export const MAX_TASK_OCCURRENCES = 62;
/** Kolizje terminów wymieniane z nazwy (reszta jako „i N innych”). */
export const MAX_LISTED_CONFLICTS = 4;
/** Dni wstecz brane pod uwagę przy liczeniu serii korzystania z aplikacji. */
export const APP_STREAK_LOOKBACK_DAYS = 400;

// --- Finanse ----------------------------------------------------------------
/** Miesiące historii w podsumowaniu finansów. */
export const FINANCE_HISTORY_MONTHS = 12;

// --- Paginacja w interfejsie --------------------------------------------------
export const NEWS_PAGE_SIZE = 30;
export const PAST_TRAINS_PAGE_SIZE = 10;

// --- Protokoły (PDF) --------------------------------------------------------
/** Maksymalna wysokość logo w nagłówku PDF (pt). */
export const REPORT_LOGO_MAX_HEIGHT = 150;
