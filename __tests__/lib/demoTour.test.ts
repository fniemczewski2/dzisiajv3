// __tests__/lib/demoTour.test.ts

import { describe, it, expect } from "vitest";
import { Calendar } from "lucide-react";
import { FEATURE_GROUPS } from "@/config/features";
import { buildDemoSteps, tryHref, DEMO_QUICK_START } from "@/lib/demoTour";

describe("buildDemoSteps", () => {
  it("zawiera każdą funkcję z FEATURE_GROUPS w tej samej kolejności", () => {
    const steps = buildDemoSteps();
    const expected = FEATURE_GROUPS.flatMap((g) => g.features.map((f) => f.title));
    expect(steps.map((s) => s.title)).toEqual(expected);
  });

  it("nadaje unikalne identyfikatory, także gdy dwie funkcje mają ten sam tytuł lub ścieżkę", () => {
    const ids = buildDemoSteps().map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("przenosi kategorię, ikonę, status i ścieżkę funkcji", () => {
    const calendar = buildDemoSteps().find((s) => s.path === "/calendar");
    expect(calendar).toMatchObject({ category: "Spotkania", title: "Kalendarz", icon: Calendar, path: "/calendar" });
  });

  it("zwraca pustą listę, gdy brak grup", () => {
    expect(buildDemoSteps([])).toEqual([]);
  });
});

describe("tryHref", () => {
  it("prowadzi przez logowanie z parametrem next", () => {
    expect(tryHref("/tasks/daySchema")).toBe("/start?next=%2Ftasks%2FdaySchema");
  });
});

describe("DEMO_QUICK_START", () => {
  it("ma kilka kroków, każdy niepusty", () => {
    expect(DEMO_QUICK_START.length).toBeGreaterThanOrEqual(3);
    for (const step of DEMO_QUICK_START) expect(step.trim()).not.toBe("");
  });
});
