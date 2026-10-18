// types/settings.ts

import type { FavoriteStop } from "@/shared/stopGrouping";
import { MoodOption } from "./moods";
import type { HabitDef } from "./habits";
import type { CustomFeed } from "@/config/rssSources";
import type { ReportTemplateSet } from "./reports";

export interface Settings {
  sort_order: string;
  show_completed: boolean;
  show_habits: boolean;
  show_water_tracker: boolean;
  show_budget_items: boolean;
  show_notifications: boolean;
  show_mood_tracker: boolean;

  users: string[];
  favorite_stops: FavoriteStop[];

  sort_notes: string;
  sort_shopping: string;
  sort_movies: string;
  sort_recipes: string;

  notif_morning_brief: boolean;
  notif_tasks: boolean;
  notif_events: boolean;
  notif_water: boolean;
  notif_habits: boolean;
  notif_evening: boolean;
  notif_birthdays: boolean;
  notif_contact: boolean;

  habit_pills: boolean;
  habit_bath: boolean;
  habit_workout: boolean;
  habit_friends: boolean;
  habit_work: boolean;
  habit_housework: boolean;
  habit_plants: boolean;
  habit_duolingo: boolean;

  mood_options?: MoodOption[];
  /** Własne kategorie zadań; null = kategorie domyślne. */
  task_categories?: string[] | null;
  /** Kolory kategorii: nazwa kategorii → kolor z palety (CATEGORY_PALETTE). */
  category_colors?: Record<string, string> | null;
  /** Wyłączone moduły (ścieżki z config/modules.ts). */
  disabled_modules?: string[] | null;
  /** Własne nawyki (max 8). null = domyślne nawyki z przełączników habit_*. */
  custom_habits?: HabitDef[] | null;
  /** Wybrane źródła wiadomości (id z config/rssSources + własne „c_…”). null = domyślne. */
  rss_sources?: string[] | null;
  /** Własne kanały RSS (max 15). */
  rss_custom?: CustomFeed[] | null;
  /** Szablony PDF protokołów (do 5; czcionki, logo). */
  report_template?: ReportTemplateSet | null;
  /** Nazwy kategorii budżetu, z których liczą się „Wydatki dnia”. */
  daily_spending_categories?: string[] | null;
  /** Push w dniu terminu płatności rachunku stałego. */
  notif_bills?: boolean;
  main_view: string;

  sort_people: string;
  hide_priority_5: boolean;

  sort_bills: string;
}

export interface EmailByIdRow {
  id: string;
  email: string;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  subscription: string | { endpoint: string; keys?: { p256dh: string; auth: string } };
  user_agent?: string;
  last_used?: string;
}
