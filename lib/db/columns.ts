// lib/db/columns.ts
//
// Jawne listy kolumn tabel (zamiast select("*")): zapytanie czyta tylko to, czego potrzebuje, a nowa kolumna w bazie
// (np. sekret) nie trafia do przeglądarki bez decyzji. Listy odpowiadają schematowi z supabase/introspect_schema.sql;
// __tests__/config/columns.test.ts sprawdza je względem migawki schematu i pilnuje, żeby w kodzie nie wróciło select("*").
// UWAGA: connected_calendars zawiera tokeny – czyta je wyłącznie serwer (klucz service role).

export const TABLE_COLUMNS = {
  budget_categories: "id, user_id, year, name, is_monthly, sort_order, created_at, updated_at, monthly_amounts",
  connected_calendars:
    "id, user_id, provider, account_email, access_token, refresh_token, expires_at, sync_token, created_at, google_calendar_id, calendar_name, sync_error",
  daily_habits:
    "date, pills, bath, workout, friends, work, housework, plants, duolingo, water_amount, user_id, id, habits_done",
  daily_overrides: "id, user_id, date, schema_id, created_at, new_time, is_hidden",
  day_schema_choices: "user_id, date, schema_id, created_at",
  day_schemas: "id, name, days, entries, created_at, user_id, is_default",
  events:
    "id, title, description, start_time, end_time, place, repeat, created_at, user_id, shared_with_id, google_event_id, calendar_id, category, recurrence",
  finance_profiles: "id, user_id, name, color, sort_order, created_at",
  letter_attachments: "id, letter_id, user_id, kind, storage_path, file_name, size_bytes, created_at",
  letters:
    "id, user_id, category, category_other, category_code, sequence_number, sequence_year, signature, issue_date, response_date, recipient, description, license_plate_number, incident_date, incident_place, created_at, updated_at",
  meeting_poll_bookings:
    "id, poll_id, date, start_time, person_key, name, email, consent_at, consent_version, created_at",
  meeting_polls:
    "id, user_id, title, description, slot_duration_minutes, time_start, time_end, share_token, status, created_at, updated_at, closes_at, finalized_at, show_results_to_respondents, mode, slot_capacity, max_slots_per_person",
  mood_entries: "id, user_id, date, mood_id",
  movies:
    "id, title, genre, rating, platform, description, watched, notes, created_at, updated_at, user_id, media_type, tmdb_id, poster_path, release_year, seasons_count, episodes_count, series_status, progress_season, progress_episode",
  notes: "id, title, items, bg_color, pinned, archived, updated_at, user_id, folder",
  people:
    "id, user_id, first_name, last_name, relationship, priority, birthday, phones, emails, notes, last_contact_date, created_at, updated_at, nameday",
  products: "id, name, created_at, user_id",
  push_subscriptions: "id, subscription, user_agent, created_at, last_used, user_id",
  recipes: "id, name, category, products, description, created_at, user_id",
  recurring_bills:
    "id, user_id, profile_id, name, amount, category_id, start_date, recurrence, active, created_at, updated_at",
  reports: "id, topic, date, agenda, participants, tasks, notes, inserted_at, updated_at, user_id, template_id",
  settings:
    "sort_order, show_completed, show_habits, show_water_tracker, show_budget_items, users, show_month_view, show_notifications, theme, favorite_stops, user_id, notif_morning_brief, notif_tasks, notif_events, notif_water, notif_habits, notif_evening, sort_notes, sort_shopping, sort_movies, sort_recipes, sort_places, show_mood_tracker, mood_options, main_view, hide_priority_5, sort_people, notif_birthdays, notif_contact, sort_bills, task_categories, category_colors, disabled_modules, custom_habits, rss_sources, rss_custom, daily_spending_categories, notif_bills, report_template, mood_consent_at, mood_consent_version, notif_day_schema, notif_reminders, notif_letters, notif_polls, notif_love, notif_shared_lists, notif_shared_tasks, notif_shared_events, health_consent_at, health_consent_version, daily_spending_limit, daily_steps_goal",
  shopping_lists: "id, name, elements, inserted_at, updated_at, user_id, shared_with_id",
  slack_lists:
    "id, connection_id, user_id, list_id, list_title, column_map, is_default, created_at, updated_at, sync_enabled, assignee_emails, import_category",
  streaks: "id, name, start_date, icon, created_at, user_id",
  tasks:
    "id, title, description, due_date, category, priority, status, scheduled_time, user_id, for_user_id, created_at, updated_at, done_at, is_recurring, repeat_days, recurring_until, recurrence, recurring_bill_id, bill_due_date",
  transactions:
    "id, user_id, profile_id, date, amount, is_income, description, category_id, recurring_bill_id, link_status, source, import_key, created_at",
  user_trains:
    "id, user_id, train_number, date, departure_time, from_station, to_station, wagon, seat, created_at, train_name, planned_arrival",
  vcard_profiles:
    "id, user_id, profile_name, full_name, avatar_url, organization, phones, emails, addresses, social_links, business_data, is_public, public_slug, created_at, updated_at, color_light, color_dark",
  work_logs: "id, user_id, description, start_time, end_time, created_at, updated_at",
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
