// __tests__/lib/taskCategories.test.ts

import { describe, it, expect } from "vitest";
import {
  DEFAULT_USER_TASK_CATEGORIES,
  SYSTEM_TASK_CATEGORIES,
  defaultTaskCategory,
  resolveUserTaskCategories,
  taskCategoryOptions,
  validateTaskCategoryName,
} from "@/lib/taskCategories";

describe("kategorie zadań", () => {
  it("domyślne = dotychczasowe kategorie bez systemowych", () => {
    expect(DEFAULT_USER_TASK_CATEGORIES).toContain("praca");
    expect(DEFAULT_USER_TASK_CATEGORIES).toContain("inne");
    for (const s of SYSTEM_TASK_CATEGORIES) expect(DEFAULT_USER_TASK_CATEGORIES).not.toContain(s);
  });

  it("brak ustawienia lub pusta lista → domyślne", () => {
    expect(resolveUserTaskCategories(null)).toEqual([...DEFAULT_USER_TASK_CATEGORIES]);
    expect(resolveUserTaskCategories([])).toEqual([...DEFAULT_USER_TASK_CATEGORIES]);
    expect(resolveUserTaskCategories(["  Dom  ", "Praca zdalna"])).toEqual(["Dom", "Praca zdalna"]);
  });

  it("opcje: własne + systemowe + bieżąca kategoria spoza listy", () => {
    expect(taskCategoryOptions(["Dom"])).toEqual(["Dom", ...SYSTEM_TASK_CATEGORIES]);
    expect(taskCategoryOptions(["Dom"], "trening")).toEqual(["Dom", ...SYSTEM_TASK_CATEGORIES, "trening"]);
    expect(taskCategoryOptions(["Dom"], "slack")).toEqual(["Dom", ...SYSTEM_TASK_CATEGORIES]);
  });

  it("domyślna kategoria nowego zadania", () => {
    expect(defaultTaskCategory(["praca", "inne"])).toBe("inne");
    expect(defaultTaskCategory(["Dom", "Praca"])).toBe("Dom");
  });

  it("walidacja nazwy", () => {
    expect(validateTaskCategoryName("  ", [])).toMatch(/pusta/);
    expect(validateTaskCategoryName("x".repeat(31), [])).toMatch(/30 znaków/);
    expect(validateTaskCategoryName("PRACA", ["praca"])).toMatch(/już istnieje/);
    expect(validateTaskCategoryName("Slack", [])).toMatch(/systemowa/);
    expect(validateTaskCategoryName("Ogród", ["praca"])).toBeNull();
  });
});
