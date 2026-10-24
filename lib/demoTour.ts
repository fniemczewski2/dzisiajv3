// lib/demoTour.ts
//
// Dane przewodnika demo: kroki po funkcjach budowane z FEATURE_GROUPS (jedno źródło prawdy
// z /start i /guide) oraz krótka instrukcja pierwszych kroków dla nowego użytkownika.

import { FEATURE_GROUPS, type Feature, type FeatureCategory } from "@/config/features";

export interface DemoStep {
  id: string;
  category: FeatureCategory;
  title: string;
  description: string;
  icon: Feature["icon"];
  /** Ścieżka do wypróbowania; brak = funkcja nie ma własnej strony. */
  path?: string;
  status?: Feature["status"];
  note?: string;
}

export const DEMO_QUICK_START: readonly string[] = [
  "Zaloguj się kontem Google na stronie „Zaloguj się”.",
  "W Ustawieniach wybierz kategorie zadań i priorytety, które najczęściej używasz.",
  "Połącz Kalendarz Google lub Outlook w sekcji kalendarza, aby zobaczyć wydarzenia w jednym miejscu.",
  "Dodaj pierwsze zadanie na Kokpicie dnia i oznacz je jako wykonane po zrobieniu.",
  "Włącz powiadomienia w Ustawieniach, jeśli chcesz przypomnień na telefonie.",
];

/** Wszystkie funkcje w kolejności z FEATURE_GROUPS; `id` jest unikalny w obrębie przewodnika. */
export function buildDemoSteps(groups: typeof FEATURE_GROUPS = FEATURE_GROUPS): DemoStep[] {
  return groups.flatMap((group) =>
    group.features.map((feature, index) => ({
      id: `${slugify(group.category)}-${index}-${slugify(feature.title)}`,
      category: group.category,
      title: feature.title,
      description: feature.description,
      icon: feature.icon,
      path: feature.path,
      status: feature.status,
      note: feature.note,
    }))
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll("ł", "l")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

/** Ścieżka „Wypróbuj”: strony wymagające logowania przechodzą przez /start z parametrem next. */
export function tryHref(path: string): string {
  return `/start?next=${encodeURIComponent(path)}`;
}
