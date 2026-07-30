// config/dataExport.ts

export interface ExportTable {
  table: string;
  label: string;
  /** Jawna lista kolumn. Podawana tam, gdzie tabela zawiera dane wrazliwe
   * (tokeny OAuth, klucze push), ktore nie moga trafic do pliku eksportu. */
  columns?: string;
}

/** Tabele objete eksportem danych uzytkownika.
 *
 * Filtrowanie po wlascicielu zapewnia RLS - zapytania ida klientem
 * zalogowanego uzytkownika, wiec baza zwraca wylacznie jego wiersze.
 *
 * Swiadomie POMINIETE:
 * - google_calendar_tokens - wylacznie tokeny OAuth, zero wartosci dla uzytkownika,
 * - stops - publiczny slownik przystankow, nie sa to dane uzytkownika,
 * - errors - logi techniczne, brak polityk RLS (dostep tylko service_role).
 */
export const EXPORT_TABLES: ExportTable[] = [
  { table: "settings", label: "Ustawienia" },
  { table: "tasks", label: "Zadania" },
  { table: "reminders", label: "Zadania cykliczne" },
  { table: "day_schemas", label: "Schematy dnia" },
  { table: "daily_overrides", label: "Wyjatki od schematow" },
  { table: "events", label: "Wydarzenia" },
  { table: "meeting_polls", label: "Ankiety terminow" },
  { table: "meeting_poll_dates", label: "Ankiety - dni" },
  { table: "meeting_poll_responses", label: "Ankiety - odpowiedzi" },
  { table: "meeting_poll_availabilities", label: "Ankiety - dostepnosc" },
  { table: "notes", label: "Notatki" },
  { table: "letters", label: "Pisma" },
  { table: "reports", label: "Sprawozdania" },
  { table: "shopping_lists", label: "Listy zakupow" },
  { table: "products", label: "Produkty" },
  { table: "recipes", label: "Przepisy" },
  { table: "movies", label: "Filmy" },
  { table: "places", label: "Miejsca" },
  { table: "people", label: "Osoby" },
  { table: "vcard_profiles", label: "Wizytowki" },
  { table: "bills", label: "Rachunki" },
  { table: "budgets", label: "Budzety" },
  { table: "budget_categories", label: "Kategorie budzetu" },
  { table: "daily_habits", label: "Nawyki" },
  { table: "mood_entries", label: "Nastroje" },
  { table: "streaks", label: "Cele i pasma" },
  { table: "work_logs", label: "Czas pracy" },
  { table: "user_trains", label: "Sledzone pociagi" },
  { table: "notifications", label: "Powiadomienia" },
  {
    table: "connected_calendars",
    label: "Polaczone kalendarze",
    // Bez access_token / refresh_token / sync_token.
    columns: "id, provider, account_email, calendar_name, google_calendar_id, created_at",
  },
  {
    table: "push_subscriptions",
    label: "Subskrypcje push",
    // Bez kluczy kryptograficznych i endpointu urzadzenia.
    columns: "id, user_agent, created_at, last_used",
  },
];

export const EXPORT_PAGE_SIZE = 1000;
export const EXPORT_FILE_PREFIX = "dzisiaj_moje_dane";
