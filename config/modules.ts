// config/navigation.ts

import {
  ListTodo,
  Logs,
  Timer,
  Edit2,
  Backpack,
  Calendar,
  ScrollText,
  Sun,
  Dumbbell,
  Coins,
  ChartColumnBig,
  CookingPot,
  ShoppingCart,
  LucideIcon,
  Target,
  Clapperboard,
  Calculator,
  BusFront,
  TrainFront,
  User,
  IdCard,
  Clock,
  Gavel,
  CalendarClock,
  Newspaper,
} from "lucide-react";

export interface NavigationButton {
  path: string;
  title: string;
  icon: LucideIcon;
  label: string;
  group?: string;
  badge?: string;
  external?: boolean;
}

export interface AppModule {
  path: string;
  title: string;
}

export interface NavigationButton {
  path: string;
  title: string;
  icon: LucideIcon;
  label: string;
  badge?: string;
  external?: boolean;
}

export interface AppModule {
  path: string;
  title: string;
}

const EXCLUDED_PATHS = new Set(["/", "/tasks", "/calendar", "/settings", "/guide", "/privacy", "/start"]);

export const NAVIGATION_BUTTONS: NavigationButton[] = [
  { path: "/tasks/daySchema", title: "Plan dnia", icon: Logs, label: "Plan\u00a0dnia", group: "Zadania" },
  { path: "/tasks", title: "Zadania", icon: ListTodo, label: "Zadania", group: "Zadania" },
  { path: "/tasks/pomodoro", title: "Pomodoro", icon: Timer, label: "Pomodoro", group: "Zadania" },
  { path: "/worklogs", title: "Czas pracy", icon: Clock, label: "Czas\u00a0pracy", group: "Produktywność" },
  { path: "/calendar", title: "Kalendarz", icon: Calendar, label: "Kalendarz", group: "Planowanie" },
  { path: "/meetings", title: "Terminy", icon: CalendarClock, label: "Terminy", group: "Planowanie" },
  { path: "/people", title: "Ludzie", icon: User, label: "Ludzie", group: "Kontakty" },
  { path: "/profiles", title: "Wizytówki", icon: IdCard, label: "Wizytówki", group: "Kontakty" },
  { path: "/notes", title: "Notatki", icon: Edit2, label: "Notatki", group: "Notatki" },
  { path: "/notes/reports", title: "Protokół", icon: ScrollText, label: "Protokół", group: "Notatki" },
  { path: "/notes/letters", title: "Pisma", icon: Gavel, label: "Pisma", group: "Notatki" },
  { path: "/news", title: "Wiadomości", icon: Newspaper, label: "Wiadomości", group: "Informacje" },
  { path: "/bills", title: "Finanse", icon: Coins, label: "Finanse", group: "Finanse" },
  { path: "/bills/budget", title: "Budżet", icon: ChartColumnBig, label: "Budżet", group: "Finanse" },
  { path: "/bills/calculator", title: "Kalkulator", icon: Calculator, label: "Kalkulator", group: "Finanse" },
  { path: "/streaks", title: "Postępy", icon: Target, label: "Postępy", group: "Nawyki" },
  { path: "/weather", title: "Pogoda", icon: Sun, label: "Pogoda", group: "Narzędzia" },
  { path: "/transport", title: "Komunikacja miejska", icon: BusFront, label: "Komunikacja", group: "Podróże" },
  { path: "/trains", title: "Pociągi", icon: TrainFront, label: "Pociągi", group: "Podróże" },
  { path: "/packing", title: "Pakowanie", icon: Backpack, label: "Pakowanie", group: "Podróże" },
  { path: "/notes/shopping", title: "Zakupy", icon: ShoppingCart, label: "Zakupy", group: "Notatki" },
  { path: "/notes/recipes", title: "Przepisy", icon: CookingPot, label: "Przepisy", group: "Styl życia" },
  { path: "/notes/movies", title: "Filmy", icon: Clapperboard, label: "Filmy", group: "Rozrywka" },
  { path: "/training", title: "Trening", icon: Dumbbell, label: "Trening", group: "Zdrowie" },
];

/**
 * Znajduje najlepiej pasujący (najdłuższy) wyłączalny moduł dla danej ścieżki.
 */
export function moduleForPath(pathname: string): string | null {
  const cleanPath = pathname.split("?")[0];
  let best: string | null = null;

  for (const path of TOGGLEABLE_PATHS) {
    if (cleanPath === path || cleanPath.startsWith(`${path}/`)) {
      if (!best || path.length > best.length) {
        best = path;
      }
    }
  }

  return best;
}

/**
 * Sprawdza, czy ścieżka jest włączona.
 * Ścieżki bazowe (np. /tasks, /calendar, /tasks/daySchema) nie są w TOGGLEABLE_PATHS,
 * więc moduleForPath zwróci dla nich null i funkcja zawsze zwróci true (są zawsze aktywne).
 */
export function isPathEnabled(pathname: string, disabled: readonly string[] | null | undefined): boolean {
  if (!disabled || disabled.length === 0) return true;
  const mod = moduleForPath(pathname);
  return !mod || !disabled.includes(mod);
}

/**
 * Czyści listę z bazy: zostawia tylko unikalne, rzeczywiście wyłączalne ścieżki.
 */
export function normalizeDisabledModules(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((p): p is string => typeof p === "string" && TOGGLEABLE_PATHS_SET.has(p)))];
}

export const TOGGLEABLE_MODULES: readonly AppModule[] = NAVIGATION_BUTTONS.filter(
  (item) => !EXCLUDED_PATHS.has(item.path)
).map(({ path, title }) => ({ path, title }));

const TOGGLEABLE_PATHS: readonly string[] = TOGGLEABLE_MODULES.map((m) => m.path);
const TOGGLEABLE_PATHS_SET = new Set(TOGGLEABLE_PATHS);