// __tests__/lib/v140.test.ts – moduły, schematy dnia, nawyki, seria dni, bilety

import { describe, it, expect } from "vitest";
import { isPathEnabled, moduleForPath, normalizeDisabledModules } from "@/config/modules";
import { resolveActiveSchema } from "@/lib/daySchemas";
import { isHabitDone, normalizeHabits, resolveHabits, LEGACY_HABITS } from "@/lib/habits";
import { computeStreak } from "@/lib/appStreak";
import { isTravelCategory, ticketTaskDay } from "@/lib/travelTickets";
import { belongsOnList } from "@/lib/server/slackSync/syncList";
import type { Schema } from "@/types/schemas";
import type { DailyHabitsRow } from "@/types/habits";

describe("moduły", () => {
  it("najdłuższe dopasowanie ścieżki", () => {
    expect(moduleForPath("/bills/budget")).toBe("/bills/budget");
    expect(moduleForPath("/bills")).toBe("/bills");
    expect(moduleForPath("/packing/[id]")).toBe("/packing");
    expect(moduleForPath("/tasks")).toBeNull();
  });
  it("wyłączenie Finansów nie wyłącza Budżetu, rdzeń zawsze działa", () => {
    expect(isPathEnabled("/bills", ["/bills"])).toBe(false);
    expect(isPathEnabled("/bills/budget", ["/bills"])).toBe(true);
    expect(isPathEnabled("/calendar", ["/calendar"])).toBe(true);
    expect(normalizeDisabledModules(["/calendar", "/trains", 5])).toEqual(["/trains"]);
  });
});

describe("schematy dnia", () => {
  const s = (id: string, days: number[], is_default = false): Schema => ({
    id,
    name: id,
    days,
    entries: [],
    is_default,
  });
  const schemas = [s("zwykly", [0, 1, 2, 3, 4]), s("warsztat", [3], true), s("weekend", [5, 6])];
  it("domyślny wygrywa z pierwszym, ręczny wybór z domyślnym", () => {
    expect(resolveActiveSchema(schemas, 3, undefined)?.id).toBe("warsztat");
    expect(resolveActiveSchema(schemas, 2, undefined)?.id).toBe("zwykly");
    expect(resolveActiveSchema(schemas, 3, "weekend")?.id).toBe("weekend");
    expect(resolveActiveSchema(schemas, 3, null)).toBeNull();
    expect(resolveActiveSchema(schemas, 3, "usuniety")?.id).toBe("warsztat");
  });
});

describe("nawyki", () => {
  it("bez własnej listy – włączone domyślne", () => {
    expect(resolveHabits({ custom_habits: null, habit_pills: false } as never)).toHaveLength(LEGACY_HABITS.length - 1);
  });
  it("maksymalnie 8, bez pustych i duplikatów", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: `h${i % 10}`,
      label: i === 0 ? " " : `N${i}`,
      icon: "Nope",
    }));
    const result = normalizeHabits(many);
    expect(result).toHaveLength(8);
    expect(result.every((h) => h.icon === "Sparkles")).toBe(true);
  });
  it("odhaczenie: nowe pole albo dawna kolumna", () => {
    const row = { pills: true, habits_done: { h_spacer: true } } as unknown as DailyHabitsRow;
    expect(isHabitDone(row, "pills")).toBe(true);
    expect(isHabitDone(row, "h_spacer")).toBe(true);
    expect(isHabitDone(row, "bath")).toBe(false);
  });
});

describe("seria dni", () => {
  it("liczy do dziś albo do wczoraj, przerwa zeruje", () => {
    expect(computeStreak(["2026-10-11", "2026-10-10", "2026-10-09", "2026-10-07"], "2026-10-11")).toBe(3);
    expect(computeStreak(["2026-10-10", "2026-10-09"], "2026-10-11")).toBe(2);
    expect(computeStreak(["2026-10-08"], "2026-10-11")).toBe(0);
  });
});

describe("bilety", () => {
  it("rozpoznaje kategorie podróżne i liczy 30 dni wstecz (nie wcześniej niż dziś)", () => {
    expect(isTravelCategory("podróże")).toBe(true);
    expect(isTravelCategory("Wyjazdy")).toBe(true);
    expect(isTravelCategory("praca")).toBe(false);
    const today = new Date(2026, 9, 11);
    expect(ticketTaskDay("2026-12-20", today)).toBe("2026-11-20");
    expect(ticketTaskDay("2026-10-20", today)).toBe("2026-10-11");
  });
});

describe("Slack bez kategorii", () => {
  const target = { listId: "L1", isDefault: true };
  it("nowe zadania trafiają do Slacka tylko z wybraną listą", () => {
    expect(belongsOnList({ category: "praca" }, undefined, target)).toBe(false);
    expect(belongsOnList({ category: "praca" }, "L1", target)).toBe(true);
    expect(belongsOnList({ category: "praca" }, "L2", target)).toBe(false);
    expect(belongsOnList({ category: "slack" }, undefined, target)).toBe(true); // zgodność wstecz
  });
});
