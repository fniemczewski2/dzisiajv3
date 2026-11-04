// supabase/functions/_shared/columns.ts
//
// Kopia list kolumn z lib/db/columns.ts dla funkcji Edge (Deno nie importuje spoza supabase/functions).
// __tests__/config/columns.test.ts pilnuje zgodności z wersją aplikacji.

export const TABLE_COLUMNS = {
  day_schemas: "id, name, days, entries, created_at, user_id, is_default",
  events:
    "id, title, description, start_time, end_time, place, repeat, created_at, user_id, shared_with_id, google_event_id, calendar_id, category, recurrence",
  people:
    "id, user_id, first_name, last_name, relationship, priority, birthday, phones, emails, notes, last_contact_date, created_at, updated_at, nameday",
  recurring_bills:
    "id, user_id, profile_id, name, amount, category_id, start_date, recurrence, active, created_at, updated_at",
  settings:
    "sort_order, show_completed, show_habits, show_water_tracker, show_budget_items, users, show_month_view, show_notifications, theme, favorite_stops, user_id, notif_morning_brief, notif_tasks, notif_events, notif_water, notif_habits, notif_evening, sort_notes, sort_shopping, sort_movies, sort_recipes, sort_places, show_mood_tracker, mood_options, main_view, hide_priority_5, sort_people, notif_birthdays, notif_contact, sort_bills, task_categories, category_colors, disabled_modules, custom_habits, rss_sources, rss_custom, daily_spending_categories, notif_bills, report_template, mood_consent_at, mood_consent_version, notif_day_schema, notif_reminders, notif_letters, notif_polls, notif_love, notif_shared_lists, notif_shared_tasks, notif_shared_events, health_consent_at, health_consent_version, daily_spending_limit, daily_steps_goal",
  tasks:
    "id, title, description, due_date, category, priority, status, scheduled_time, user_id, for_user_id, created_at, updated_at, done_at, is_recurring, repeat_days, recurring_until, recurrence, recurring_bill_id, bill_due_date",
} as const;

export type KnownTable = keyof typeof TABLE_COLUMNS;

/**
 * Lista kolumn do select() dla tabeli.
 *
 * Typ zwracany to celowo "*": klient Supabase bez wygenerowanych typów bazy zwraca wtedy wiersze jako `any` (tak jak
 * dotychczas przy select("*")), a przy typie `string` – bezużyteczny GenericStringError. W czasie działania wartość to
 * jawna lista kolumn. Po wygenerowaniu typów bazy (supabase gen types) można zwrócić tu dokładny literał.
 */
export const cols = (table: KnownTable): "*" => TABLE_COLUMNS[table] as unknown as "*";
