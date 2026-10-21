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
  badge?: string;
  external?: boolean;
}

export interface AppModule {
  path: string;
  title: string;
}

const EXCLUDED_PATHS = new Set([
  "/",
  "/tasks",
  "/calendar",
  "/settings",
  "/guide",
  "/privacy",
  "/start",
]);

export const NAVIGATION_BUTTONS: NavigationButton[] = [
  { path: "/tasks/daySchema", title: "Plan dnia", icon: Logs, label: "Plan\u00a0dnia" },
  { path: "/tasks", title: "Zadania", icon: ListTodo, label: "Zadania" },
  { path: "/tasks/pomodoro", title: "Pomodoro", icon: Timer, label: "Pomodoro" },
  { path: "/worklogs", title: "Czas pracy", icon: Clock, label: "Czas\u00a0pracy" },
  { path: "/calendar", title: "Kalendarz", icon: Calendar, label: "Kalendarz" },
  { path: "/meetings", title: "Terminy", icon: CalendarClock, label: "Terminy" },
  { path: "/people", title: "Ludzie", icon: User, label: "Ludzie" },
  { path: "/profiles", title: "Wizytówki", icon: IdCard, label: "Wizytówki" },
  { path: "/notes", title: "Notatki", icon: Edit2, label: "Notatki" },
  { path: "/notes/reports", title: "Protokół", icon: ScrollText, label: "Protokół" },
  { path: "/notes/letters", title: "Pisma", icon: Gavel, label: "Pisma" },
  { path: "/news", title: "Wiadomości", icon: Newspaper, label: "Wiadomości" },
  { path: "/bills", title: "Finanse", icon: Coins, label: "Finanse" },
  { path: "/bills/budget", title: "Budżet", icon: ChartColumnBig, label: "Budżet" },
  { path: "/bills/calculator", title: "Kalkulator", icon: Calculator, label: "Kalkulator" },
  { path: "/streaks", title: "Postępy", icon: Target, label: "Postępy" },
  { path: "/weather", title: "Pogoda", icon: Sun, label: "Pogoda" },
  { path: "/transport", title: "Komunikacja miejska", icon: BusFront, label: "Komunikacja" },
  { path: "/trains", title: "Pociągi", icon: TrainFront, label: "Pociągi" },
  { path: "/packing", title: "Pakowanie", icon: Backpack, label: "Pakowanie" },
  { path: "/notes/shopping", title: "Zakupy", icon: ShoppingCart, label: "Zakupy" },
  { path: "/notes/recipes", title: "Przepisy", icon: CookingPot, label: "Przepisy" },
  { path: "/notes/movies", title: "Filmy", icon: Clapperboard, label: "Filmy" },
  { path: "/training", title: "Trening", icon: Dumbbell, label: "Trening" }
];

export const TOGGLEABLE_MODULES: readonly AppModule[] = NAVIGATION_BUTTONS
  .filter((item) => !EXCLUDED_PATHS.has(item.path))
  .map(({ path, title }) => ({ path, title }));

  // Wyciągamy ścieżki, które faktycznie można przełączać/wyłączać:
export const TOGGLEABLE_PATHS: readonly string[] = TOGGLEABLE_MODULES.map((m) => m.path);
const TOGGLEABLE_PATHS_SET = new Set(TOGGLEABLE_PATHS);

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