// __tests__/lib/dailyBrief.test.ts

import { describe, it, expect } from "vitest";
import { appTimeHm, billsDue, briefVisibility, eveningParts } from "@/lib/dailyBrief";
import type { RecurringBill, Transaction } from "@/types/finance";

const base = {
  brief_morning_time: "07:00",
  brief_evening_time: "21:00",
  brief_dismissed_morning: null,
  brief_dismissed_evening: null,
};

describe("briefVisibility", () => {
  it("od godziny z ustawień do zamknięcia tego dnia", () => {
    expect(briefVisibility(base, "2026-11-20", "06:59")).toEqual({ morning: false, evening: false });
    expect(briefVisibility(base, "2026-11-20", "07:00")).toEqual({ morning: true, evening: false });
    expect(briefVisibility(base, "2026-11-20", "21:30")).toEqual({ morning: true, evening: true });
    expect(briefVisibility({ ...base, brief_dismissed_morning: "2026-11-20" }, "2026-11-20", "08:00").morning).toBe(
      false
    );
    expect(briefVisibility({ ...base, brief_dismissed_morning: "2026-11-19" }, "2026-11-20", "08:00").morning).toBe(
      true
    );
  });

  it("niepoprawna godzina → domyślna", () => {
    expect(briefVisibility({ ...base, brief_morning_time: "7" }, "2026-11-20", "06:30").morning).toBe(false);
  });
});

describe("eveningParts", () => {
  it("tryby", () => {
    expect(eveningParts("summary")).toEqual({ summary: true, tomorrow: false });
    expect(eveningParts("tomorrow")).toEqual({ summary: false, tomorrow: true });
    expect(eveningParts(undefined)).toEqual({ summary: true, tomorrow: true });
  });
});

describe("appTimeHm", () => {
  it("czas polski niezależnie od strefy urządzenia", () => {
    expect(appTimeHm(new Date("2026-07-01T05:30:00Z"))).toBe("07:30");
    expect(appTimeHm(new Date("2026-12-01T05:30:00Z"))).toBe("06:30");
  });
});

describe("billsDue", () => {
  const bill = (id: string, day: number): RecurringBill => ({
    id,
    user_id: "u",
    profile_id: null,
    name: `R${id}`,
    amount: 10,
    category_id: null,
    start_date: `2026-01-${String(day).padStart(2, "0")}`,
    recurrence: { freq: "monthly", interval: 1 } as RecurringBill["recurrence"],
    active: true,
  });

  it("dziś, zaległe i zapłacone", () => {
    const paid: Transaction = {
      id: "t",
      user_id: "u",
      profile_id: null,
      date: "2026-11-05",
      amount: 10,
      is_income: false,
      description: "",
      category_id: null,
      recurring_bill_id: "3",
      link_status: "manual",
      source: "manual",
      import_key: null,
    };
    const out = billsDue([bill("1", 20), bill("2", 10), bill("3", 5)], [paid], "2026-11-20");
    expect(out.dueToday.map((b) => b.id)).toEqual(["1"]);
    expect(out.overdue.map((b) => b.id)).toEqual(["2"]);
  });
});
