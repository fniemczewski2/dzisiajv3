// config/defaults.ts
//
// Wartości domyślne: ustawienia nowego konta, nastroje, kalkulator rachunków,
// formularze. Limity – config/limits.ts, czasy – config/timing.ts.

import type { MoodOption } from "@/types/moods";
import type { Settings } from "@/types/settings";

/**
 * Domyślne nastroje. Kolory pochodzą z palety kategorii (lib/categoryColors.ts):
 * na każdym leży biały tekst z kontrastem co najmniej 4.5:1.
 * Identyfikatory są zapisane we wpisach nastroju w bazie – nie zmieniaj ich.
 */
export const DEFAULT_MOODS: MoodOption[] = [
  { id: "m1", label: "Nerwowo", color: "#B83232" },
  { id: "m2", label: "Męcząco", color: "#A74B07" },
  { id: "m3", label: "Neutralnie", color: "#8A530C" },
  { id: "m4", label: "Radośnie", color: "#0F7B6C" },
  { id: "m5", label: "Smutno", color: "#1D5FB0" },
  { id: "m6", label: "Spokojnie", color: "#644CAA" },
];

/** Ustawienia nowego konta; brakujące kolumny w wierszu `settings` biorą te wartości. */
export const DEFAULT_SETTINGS: Settings = {
  sort_order: "priority",
  show_completed: true,
  show_habits: true,
  show_water_tracker: true,
  show_budget_items: true,
  show_mood_tracker: true,
  show_notifications: true,
  users: [],
  favorite_stops: [],
  notif_morning_brief: true,
  notif_tasks: true,
  notif_events: true,
  notif_water: true,
  notif_habits: true,
  notif_evening: true,
  notif_birthdays: true,
  notif_contact: true,
  notif_day_schema: true,
  notif_reminders: true,
  notif_letters: true,
  notif_polls: true,
  notif_love: true,
  sort_notes: "updated_desc",
  sort_shopping: "updated_desc",
  sort_movies: "updated_desc",
  sort_recipes: "category",
  mood_options: DEFAULT_MOODS,
  mood_consent_at: null,
  mood_consent_version: null,
  task_categories: null,
  category_colors: null,
  disabled_modules: null,
  custom_habits: null,
  rss_sources: null,
  rss_custom: null,
  report_template: null,
  daily_spending_categories: null,
  notif_bills: false,
  main_view: "calendar",
  sort_people: "alphabetical",
  hide_priority_5: false,
  sort_bills: "month",
};

/**
 * Kalkulator rachunków – wartości startowe pól (zł, % podatku).
 * Składka ZUS zmienia się co roku – zaktualizuj ją na początku roku.
 */
export const BILLS_CALCULATOR_DEFAULTS = {
  flatRental: 2000,
  flatFee: 630,
  taxPercent: 8.5,
  zus: 798,
} as const;

/** Wydarzenia: domyślny czas trwania i godzina startu na inny dzień niż dziś. */
export const DEFAULT_EVENT_DURATION_MIN = 60;
export const DEFAULT_OTHER_DAY_START_HOUR = 9;

/** Ankiety terminów: przycisk „najbliższe N dni robocze”. */
export const MEETING_POLL_QUICK_WORKING_DAYS = 5;

/** Zadania: zakres podglądu powtórzeń na liście (dni). */
export const RECURRING_PREVIEW_DAYS = 14;

/** Protokoły (PDF): domyślna szerokość logo i kolor nagłówków. */
export const DEFAULT_REPORT_LOGO_WIDTH = 140;
export const DEFAULT_REPORT_HEADING_COLOR = "#0A2947";

/** Pomodoro: domyślna długość skupienia i przerwy (s). */
export const POMODORO_DEFAULT_FOCUS_SECONDS = 25 * 60;
export const POMODORO_DEFAULT_BREAK_SECONDS = 5 * 60;

/** Wizytówka: domyślny kolor nagłówka w jasnym i ciemnym motywie (ten sam w edytorze i podglądzie). */
export const VCARD_DEFAULT_COLOR_LIGHT = "#1D5FB0";
export const VCARD_DEFAULT_COLOR_DARK = "#0A2947";

/**
 * Wersja treści zgody na moduł nastroju (art. 9 RODO). Zmiana treści klauzuli
 * w MoodTracker = nowa wersja, a użytkownicy zostaną poproszeni o zgodę ponownie.
 * Zgody zapisane przed wprowadzeniem wersji (pusta kolumna) dotyczą wersji pierwszej.
 */
export const MOOD_CONSENT_VERSION = "2026-10-18";
export const MOOD_CONSENT_LEGACY_VERSION = "2026-10-18";

/** Priorytet zadania, gdy źródło go nie podaje (import ze Slacka, protokoły, szybkie notatki). */
export const DEFAULT_TASK_PRIORITY = 3;
