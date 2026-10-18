// __tests__/lib/taskOccurrences.test.ts

import { describe, it, expect } from "vitest";
import { projectTaskOccurrences, groupPreviewsByDate } from "@/lib/taskOccurrences";
import type { Task } from "@/types/tasks";

const task = (over: Partial<Task>): Task =>
  ({
    id: "t1",
    title: "Zadanie",
    description: "",
    category: "dom",
    priority: 3,
    due_date: "2026-10-12",
    status: "pending",
    user_id: "u",
    for_user_id: "u",
    is_recurring: true,
    recurrence: { freq: "weekly", interval: 1, byWeekday: [0, 3] },
    ...over,
  }) as Task;

const TODAY = "2026-10-12"; // poniedziałek

describe("projectTaskOccurrences", () => {
  it("pokazuje przyszłe wystąpienia, bez bieżącego terminu", () => {
    const p = projectTaskOccurrences([task({})], "2026-10-12", "2026-10-22", TODAY);
    expect(p.map((x) => x.date)).toEqual(["2026-10-15", "2026-10-19", "2026-10-22"]);
  });

  it("zaległe zadanie: podgląd tylko po dzisiejszym dniu", () => {
    const p = projectTaskOccurrences([task({ due_date: "2026-10-05" })], "2026-10-01", "2026-10-16", TODAY);
    expect(p.map((x) => x.date)).toEqual(["2026-10-15"]);
  });

  it("zrobione, czekające na przesunięcie terminu – też w podglądzie", () => {
    const p = projectTaskOccurrences([task({ status: "done" })], "2026-10-13", "2026-10-16", TODAY);
    expect(p.map((x) => x.date)).toEqual(["2026-10-15"]);
  });

  it("pomija zadania niecykliczne i czekające na akceptację", () => {
    const tasks = [task({ id: "a", is_recurring: false }), task({ id: "b", status: "waiting_for_acceptance" })];
    expect(projectTaskOccurrences(tasks, "2026-10-12", "2026-12-31", TODAY)).toEqual([]);
  });

  it("dawne zadania co N dni (repeat_days)", () => {
    const p = projectTaskOccurrences([task({ recurrence: null, repeat_days: 3 })], "2026-10-12", "2026-10-20", TODAY);
    expect(p.map((x) => x.date)).toEqual(["2026-10-15", "2026-10-18"]);
  });

  it("31. dnia: luty dostaje ostatni dzień miesiąca", () => {
    const t = task({ due_date: "2027-01-31", recurrence: { freq: "monthly", interval: 1, monthlyBy: "monthday" } });
    const p = projectTaskOccurrences([t], "2027-02-01", "2027-04-30", TODAY);
    expect(p.map((x) => x.date)).toEqual(["2027-02-28", "2027-03-31", "2027-04-30"]);
  });

  it("grupuje po dniu", () => {
    const p = projectTaskOccurrences(
      [task({}), task({ id: "t2", title: "Drugie" })],
      "2026-10-15",
      "2026-10-15",
      TODAY
    );
    expect(groupPreviewsByDate(p).get("2026-10-15")).toHaveLength(2);
  });
});
