// config/modules.ts
//
// Moduły, które użytkownik może wyłączyć w Ustawieniach. Wyłączony moduł
// znika z menu, wyszukiwarki i szybkich akcji, a jego strona pokazuje
// informację z przyciskiem włączenia. Dane nie są usuwane.
// Rdzeń aplikacji (Dzisiaj, Zadania, Kalendarz, Ustawienia) jest zawsze włączony.

import { NAVIGATION_CATEGORIES } from "./navigation";

/** Ścieżki, których nie da się wyłączyć. */
export const CORE_PATHS: readonly string[] = ["/", "/tasks", "/calendar", "/settings", "/guide", "/privacy", "/start"];

export interface AppModule {
  path: string;
  title: string;
  group: string;
}

/** Wszystkie wyłączalne moduły – z menu, bez rdzenia. */
export const TOGGLEABLE_MODULES: readonly AppModule[] = NAVIGATION_CATEGORIES.flatMap((category) =>
  category.items
    .filter((item) => !CORE_PATHS.includes(item.path))
    .map((item) => ({ path: item.path, title: item.title, group: category.name }))
);

const MODULE_PATHS = TOGGLEABLE_MODULES.map((m) => m.path);

/**
 * Moduł, do którego należy ścieżka strony (np. „/packing/[id]” → „/packing”).
 * Wygrywa najdłuższe dopasowanie, więc „/bills/budget” to Budżet, a nie Finanse.
 */
export function moduleForPath(pathname: string): string | null {
  let best: string | null = null;
  for (const path of MODULE_PATHS) {
    if (pathname === path || pathname.startsWith(`${path}/`)) {
      if (!best || path.length > best.length) best = path;
    }
  }
  // Strona podrzędna rdzenia (np. /tasks/pomodoro) jest modułem tylko, jeśli jest na liście.
  return best;
}

export function isPathEnabled(pathname: string, disabled: readonly string[] | null | undefined): boolean {
  if (!disabled || disabled.length === 0) return true;
  const mod = moduleForPath(pathname.split("?")[0]);
  return !mod || !disabled.includes(mod);
}

/** Czyści listę z bazy: tylko znane, wyłączalne ścieżki. */
export function normalizeDisabledModules(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((p): p is string => typeof p === "string" && MODULE_PATHS.includes(p)))];
}
