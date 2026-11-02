// config/modules.ts
//
// Menu aplikacji: kolejność grup (NAV_GROUPS) i pozycji. Test __tests__/config/navigation.test.ts pilnuje,
// żeby każdy widok był w menu, a grupy były spójne i w tej kolejności.

import {
  ListTodo,
  Mail,
  Logs,
  Timer,
  Edit2,
  Backpack,
  Calendar,
  ScrollText,
  Sun,
  Dumbbell,
  HeartPulse,
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
  Repeat,
  Pen,
  LayoutDashboard,
  CalendarClock,
  Newspaper,
} from "lucide-react";

/** Grupy menu w kolejności wyświetlania: praca dzienna → planowanie → komunikacja → dokumenty → finanse → dom → podróże → reszta. */
export const NAV_GROUPS = [
  "Dzień",
  "Planowanie",
  "Komunikacja",
  "Dokumenty",
  "Finanse",
  "Dom i zdrowie",
  "Podróże",
  "Informacje i rozrywka",
] as const;
export type NavGroup = (typeof NAV_GROUPS)[number];

export interface NavigationButton {
  path: string;
  title: string;
  icon: LucideIcon;
  label: string;
  group: NavGroup;
  badge?: string;
  external?: boolean;
}

export interface AppModule {
  path: string;
  title: string;
}

/** Widoki zawsze włączone (nie da się ich wyłączyć w ustawieniach). */
const EXCLUDED_PATHS = new Set([
  "/",
  "/tasks",
  "/tasks/recurring",
  "/calendar",
  "/settings",
  "/guide",
  "/privacy",
  "/start",
]);

export const NAVIGATION_BUTTONS: NavigationButton[] = [
  { path: "/tasks/daySchema", title: "Plan dnia", icon: Logs, label: "Plan\u00a0dnia", group: "Dzień" },
  { path: "/tasks", title: "Zadania", icon: ListTodo, label: "Zadania", group: "Dzień" },
  { path: "/tasks/recurring", title: "Zadania cykliczne", icon: Repeat, label: "Cykliczne", group: "Dzień" },
  { path: "/tasks/pomodoro", title: "Pomodoro", icon: Timer, label: "Pomodoro", group: "Dzień" },
  { path: "/streaks", title: "Postępy", icon: Target, label: "Postępy", group: "Dzień" },

  { path: "/calendar", title: "Kalendarz", icon: Calendar, label: "Kalendarz", group: "Planowanie" },
  { path: "/meetings", title: "Terminy", icon: CalendarClock, label: "Terminy", group: "Planowanie" },
  { path: "/worklogs", title: "Czas pracy", icon: Clock, label: "Czas\u00a0pracy", group: "Planowanie" },

  { path: "/mail", title: "Poczta", icon: Mail, label: "Poczta", group: "Komunikacja" },
  { path: "/people", title: "Ludzie", icon: User, label: "Ludzie", group: "Komunikacja" },
  { path: "/profiles", title: "Wizytówki", icon: IdCard, label: "Wizytówki", group: "Komunikacja" },

  { path: "/notes", title: "Notatki", icon: Edit2, label: "Notatki", group: "Dokumenty" },
  { path: "/notes/reports", title: "Protokół", icon: ScrollText, label: "Protokół", group: "Dokumenty" },
  { path: "/notes/letters", title: "Pisma", icon: Gavel, label: "Pisma", group: "Dokumenty" },

  { path: "/bills", title: "Finanse", icon: Coins, label: "Finanse", group: "Finanse" },
  { path: "/bills/budget", title: "Budżet", icon: ChartColumnBig, label: "Budżet", group: "Finanse" },
  { path: "/bills/calculator", title: "Kalkulator", icon: Calculator, label: "Kalkulator", group: "Finanse" },

  { path: "/notes/shopping", title: "Zakupy", icon: ShoppingCart, label: "Zakupy", group: "Dom i zdrowie" },
  { path: "/notes/recipes", title: "Przepisy", icon: CookingPot, label: "Przepisy", group: "Dom i zdrowie" },
  { path: "/training", title: "Trening", icon: Dumbbell, label: "Trening", group: "Dom i zdrowie" },
  { path: "/health", title: "Zdrowie", icon: HeartPulse, label: "Zdrowie", group: "Dom i zdrowie" },

  { path: "/weather", title: "Pogoda", icon: Sun, label: "Pogoda", group: "Podróże" },
  { path: "/transport", title: "Komunikacja miejska", icon: BusFront, label: "Komunikacja", group: "Podróże" },
  { path: "/trains", title: "Pociągi", icon: TrainFront, label: "Pociągi", group: "Podróże" },
  { path: "/packing", title: "Pakowanie", icon: Backpack, label: "Pakowanie", group: "Podróże" },

  { path: "/news", title: "Wiadomości", icon: Newspaper, label: "Wiadomości", group: "Informacje i rozrywka" },
  { path: "/notes/movies", title: "Filmy", icon: Clapperboard, label: "Filmy", group: "Informacje i rozrywka" },
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

// --- Dolny pasek ---------------------------------------------------------------
export interface BottomBarItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Pozycja menu, którą ten skrót powtarza – w menu jest wtedy pomijana. */
  covers: string;
}

/** Skróty dolnego paska dla widoku głównego (ustawienie main_view). */
export const BOTTOM_BAR: Readonly<Record<string, readonly BottomBarItem[]>> = {
  tasks: [
    { href: "/", label: "Zadania", icon: ListTodo, covers: "/tasks" },
    { href: "/notes", label: "Notatki", icon: Pen, covers: "/notes" },
    { href: "/bills", label: "Finanse", icon: Coins, covers: "/bills" },
    { href: "/calendar", label: "Kalendarz", icon: Calendar, covers: "/calendar" },
  ],
  calendar: [
    { href: "/", label: "Kalendarz", icon: Calendar, covers: "/calendar" },
    { href: "/tasks", label: "Zadania", icon: ListTodo, covers: "/tasks" },
    { href: "/notes", label: "Notatki", icon: Pen, covers: "/notes" },
    { href: "/bills", label: "Finanse", icon: Coins, covers: "/bills" },
  ],
  day_view: [
    { href: "/", label: "Dzisiaj", icon: LayoutDashboard, covers: "/" },
    { href: "/tasks", label: "Zadania", icon: ListTodo, covers: "/tasks" },
    { href: "/notes", label: "Notatki", icon: Pen, covers: "/notes" },
    { href: "/bills", label: "Finanse", icon: Coins, covers: "/bills" },
  ],
};

/** Pozycje menu bez tych, które są już na dolnym pasku (bez duplikatów). */
export function menuItemsFor(mainView: string | null | undefined): NavigationButton[] {
  const covered = new Set((BOTTOM_BAR[mainView ?? ""] ?? []).map((i) => i.covers));
  return NAVIGATION_BUTTONS.filter((item) => !covered.has(item.path));
}

/**
 * Liczby elementów w kolejnych wierszach menu: najwyżej 4, możliwie równo (np. 22 → 4,4,4,4,3,3).
 * Wiersze pełniejsze są na górze; elementy mają jednakową szerokość niezależnie od wiersza.
 */
export function menuRowSizes(count: number, perRow = 4): number[] {
  if (count <= 0) return [];
  const rows = Math.ceil(count / perRow);
  const base = Math.floor(count / rows);
  const extra = count % rows;
  return Array.from({ length: rows }, (_, i) => base + (i < extra ? 1 : 0));
}
