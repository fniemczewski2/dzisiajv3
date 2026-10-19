// config/userData.ts
//
// Rejestr wszystkich tabel z danymi użytkownika – jedno źródło dla eksportu
// danych (RODO art. 15 i 20) i usuwania konta (art. 17). Nowa tabela z danymi
// osoby MUSI trafić tutaj; test __tests__/config/userData.test.ts pilnuje,
// żeby eksport i usuwanie obejmowały te same tabele.
//
// `stage` – kolejność usuwania: najpierw tabele zależne (klucze obce), potem
// tabele, na które wskazują. Działa niezależnie od tego, czy klucze obce
// w bazie mają ON DELETE CASCADE.

export interface UserTable {
  table: string;
  /** Nazwa sekcji w pliku eksportu. */
  label: string;
  /** Kolumna wskazująca właściciela wiersza. */
  owner: "user_id" | "id";
  /** Kolumny w eksporcie; brak = wszystkie. Tokeny i sekrety nigdy nie trafiają do pliku. */
  exportColumns?: string;
  /** Kolejność usuwania (rosnąco). */
  stage: 1 | 2 | 3 | 4 | 5;
}

export const USER_TABLES: readonly UserTable[] = [
  // Etap 1 – tabele bez zależnych.
  { table: "task_reminders", label: "Przypomnienia o zadaniach", owner: "user_id", stage: 1 },
  { table: "slack_task_links", label: "Slack – powiązane zadania", owner: "user_id", stage: 1 },
  { table: "slack_task_targets", label: "Slack – zadania do wysłania", owner: "user_id", stage: 1 },
  { table: "slack_deleted_tasks", label: "Slack – zadania do usunięcia", owner: "user_id", stage: 1 },
  { table: "day_schema_choices", label: "Wybrane schematy dnia", owner: "user_id", stage: 1 },
  { table: "daily_overrides", label: "Wyjątki od schematów dnia", owner: "user_id", stage: 1 },
  { table: "quick_notes", label: "Szybkie notatki", owner: "user_id", stage: 1 },
  { table: "app_usage_days", label: "Dni korzystania z aplikacji", owner: "user_id", stage: 1 },
  { table: "notifications", label: "Powiadomienia", owner: "user_id", stage: 1 },
  { table: "errors", label: "Zgłoszenia błędów", owner: "user_id", stage: 1 },
  {
    table: "push_subscriptions",
    label: "Urządzenia z powiadomieniami",
    owner: "user_id",
    exportColumns: "id, user_agent, created_at, last_used",
    stage: 1,
  },
  {
    table: "shortcut_tokens",
    label: "Token Skrótów Siri",
    owner: "user_id",
    exportColumns: "created_at, last_used_at",
    stage: 1,
  },
  {
    table: "google_calendar_tokens",
    label: "Dawne połączenie z Kalendarzem Google",
    owner: "user_id",
    exportColumns: "scope, created_at, updated_at",
    stage: 1,
  },
  { table: "mood_entries", label: "Nastroje", owner: "user_id", stage: 1 },
  { table: "daily_habits", label: "Nawyki", owner: "user_id", stage: 1 },
  { table: "streaks", label: "Postępy", owner: "user_id", stage: 1 },
  { table: "work_logs", label: "Czas pracy", owner: "user_id", stage: 1 },
  { table: "user_trains", label: "Śledzone pociągi", owner: "user_id", stage: 1 },
  { table: "notes", label: "Notatki", owner: "user_id", stage: 1 },
  { table: "letters", label: "Pisma", owner: "user_id", stage: 1 },
  { table: "reports", label: "Protokoły", owner: "user_id", stage: 1 },
  { table: "products", label: "Produkty", owner: "user_id", stage: 1 },
  { table: "recipes", label: "Przepisy", owner: "user_id", stage: 1 },
  { table: "movies", label: "Filmy i seriale", owner: "user_id", stage: 1 },
  { table: "places", label: "Miejsca", owner: "user_id", stage: 1 },
  { table: "people", label: "Osoby", owner: "user_id", stage: 1 },
  { table: "vcard_profiles", label: "Wizytówki", owner: "user_id", stage: 1 },

  // Etap 2 – wskazują na tabele z etapów 3–4.
  { table: "tasks", label: "Zadania", owner: "user_id", stage: 2 },
  { table: "events", label: "Wydarzenia", owner: "user_id", stage: 2 },
  { table: "transactions", label: "Transakcje", owner: "user_id", stage: 2 },
  { table: "bills", label: "Rachunki (dawny moduł)", owner: "user_id", stage: 2 },
  {
    table: "slack_lists",
    label: "Slack – listy",
    owner: "user_id",
    exportColumns:
      "id, list_id, list_title, column_map, is_default, sync_enabled, assignee_emails, import_category, created_at, updated_at",
    stage: 2,
  },
  { table: "shopping_lists", label: "Listy zakupów", owner: "user_id", stage: 2 },
  { table: "day_schemas", label: "Schematy dnia", owner: "user_id", stage: 2 },

  // Etap 3.
  { table: "recurring_bills", label: "Rachunki stałe", owner: "user_id", stage: 3 },
  {
    table: "connected_calendars",
    label: "Połączone kalendarze",
    owner: "user_id",
    exportColumns: "id, provider, account_email, calendar_name, google_calendar_id, created_at",
    stage: 3,
  },
  {
    table: "slack_connections",
    label: "Połączenie ze Slackiem",
    owner: "user_id",
    exportColumns: "id, team_id, team_name, slack_user_id, created_at, updated_at",
    stage: 3,
  },

  // Etap 4.
  { table: "budget_categories", label: "Kategorie budżetu", owner: "user_id", stage: 4 },
  { table: "finance_profiles", label: "Profile finansowe", owner: "user_id", stage: 4 },

  // Etap 5 – ustawienia i profil konta na końcu.
  { table: "settings", label: "Ustawienia", owner: "user_id", stage: 5 },
  { table: "users", label: "Profil konta", owner: "id", stage: 5 },
];

/**
 * Ankiety terminów mają tabele podrzędne bez kolumny user_id (daty, dostępność)
 * i odpowiedzi osób trzecich – obsługuje je osobno lib/server/accountData.ts.
 */
export const MEETING_POLL_EXPORT_LABELS = {
  polls: "Ankiety terminów",
  dates: "Ankiety – dni",
  responses: "Ankiety – odpowiedzi uczestników",
  availabilities: "Ankiety – dostępność uczestników",
  ownResponses: "Moje odpowiedzi w ankietach innych osób",
} as const;

/** Kolumny ankiet w eksporcie – bez tokenów udostępniania i edycji. */
export const MEETING_POLL_EXPORT_COLUMNS = {
  polls:
    "id, title, description, slot_duration_minutes, time_start, time_end, status, created_at, updated_at, closes_at, finalized_at",
  responses: "id, poll_id, respondent_name, respondent_email, user_id, created_at, updated_at",
} as const;

/** Wiersze innych osób, które tylko wskazują na usuwane konto – zerujemy wskazanie. */
export const SHARED_REFERENCES = [
  { table: "tasks", column: "for_user_id" },
  { table: "events", column: "shared_with_id" },
  { table: "shopping_lists", column: "shared_with_id" },
] as const;

/** Prywatny bucket na duże pliki eksportu danych (gdy JSON nie mieści się w odpowiedzi). */
export const EXPORT_BUCKET = "user-exports";

export const USER_STORAGE_BUCKETS = ["letters", "avatars", "report-templates", EXPORT_BUCKET] as const;

export const ACCOUNT_DELETE_CONFIRMATION = "USUŃ KONTO";

export const EXPORT_FILE_PREFIX = "dzisiaj_moje_dane";
export const EXPORT_FORMAT_VERSION = 2;
