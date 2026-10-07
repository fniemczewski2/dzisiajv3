// config/userData.ts

export const USER_DATA_TABLES = [
  "shortcut_tokens",
  "slack_deleted_tasks",
  "slack_task_targets",
  "slack_task_links",
  "slack_lists",
  "slack_connections",
  "meeting_poll_responses",
  "errors",
  "notifications",
  "push_subscriptions",
  "connected_calendars",
  "google_calendar_tokens",
  "user_trains",
  "work_logs",
  "daily_habits",
  "daily_overrides",
  "day_schemas",
  "mood_entries",
  "streaks",
  "tasks",
  "events",
  "meeting_polls",
  "notes",
  "letters",
  "reports",
  "shopping_lists",
  "products",
  "recipes",
  "movies",
  "places",
  "people",
  "vcard_profiles",
  "bills",
  "budgets",
  "budget_categories",
  "settings",
] as const;

export const USER_STORAGE_BUCKETS = ["letters", "avatars"] as const;

export const ACCOUNT_DELETE_CONFIRMATION = "USUŃ KONTO";
