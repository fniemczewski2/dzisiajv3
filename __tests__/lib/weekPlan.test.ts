// __tests__/lib/weekPlan.test.ts
//
// Widok tygodnia: zakres dni, podział zadań na zaległe i dni, wydarzenia wielodniowe, blokada przenoszenia serii
// i urodzin oraz nowe terminy po przeniesieniu (godzina i czas trwania bez zmian, także przez zmianę czasu).

import { describe, it, expect } from "vitest";
import type { Task } from "@/types/tasks";
import type { Event } from "@/types/events";
import {
  dayDropId,
  groupEventsByDay,
  isMovableEvent,
  moveEventToDay,
  moveTaskToDay,
  parseDayDropId,
  splitWeekTasks,
  weekDays,
  weekRangeLabel,
} from "@/lib/weekPlan";

const task = (over: Partial<Task>): Task =>
  ({ id: "1", title: "Zadanie", status: "pending", due_date: "2026-11-19", ...over }) as Task;
const event = (over: Partial<Event>): Event =>
  ({
    id: "e1",
    title: "Spotkanie",
    start_time: "2026-11-19T09:00:00+00",
    end_time: "2026-11-19T10:00:00+00",
    repeat: "none",
    ...over,
  }) as Event;

describe("weekDays / weekRangeLabel", () => {
  it("wczoraj, dzień widoku i 5 kolejnych dni – także przez przełom miesiąca i roku", () => {
    expect(weekDays(new Date(2026, 11, 30))).toEqual([
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
      "2027-01-04",
    ]);
  });

  it("tytuł zakresu w jednym miesiącu i na przełomie miesięcy", () => {
    expect(weekRangeLabel(weekDays(new Date(2026, 10, 19)))).toBe("18–24 listopada");
    expect(weekRangeLabel(weekDays(new Date(2026, 10, 28)))).toMatch(/^27 lis.* – 3 gru/);
  });
});

describe("dayDropId / parseDayDropId", () => {
  it("odczytuje dzień tylko z id kolumny", () => {
    expect(parseDayDropId(dayDropId("2026-11-20"))).toBe("2026-11-20");
    expect(parseDayDropId("slot-09:00")).toBeNull();
    expect(parseDayDropId("day-20-11-2026")).toBeNull();
  });
});

describe("splitWeekTasks", () => {
  const days = weekDays(new Date(2026, 10, 19));

  it("zaległe: niewykonane, przed zakresem i przed dziś; dni: zaplanowane wg godziny, potem bez godziny", () => {
    const { overdue, byDay } = splitWeekTasks(
      [
        task({ id: "a", due_date: "2026-11-20" }),
        task({ id: "b", due_date: "2026-11-20", scheduled_time: "2026-11-20T15:00:00+00" }),
        task({ id: "c", due_date: "2026-11-20", scheduled_time: "2026-11-20T08:00:00+00" }),
        task({ id: "d", due_date: "2026-11-10" }),
        task({ id: "e", due_date: "2026-11-01" }),
        task({ id: "f", due_date: "2026-11-05", status: "done" }),
        task({ id: "g", due_date: "2026-12-01" }),
      ],
      days,
      "2026-11-19"
    );
    expect(byDay["2026-11-20"].map((t) => t.id)).toEqual(["c", "b", "a"]);
    expect(overdue.map((t) => t.id)).toEqual(["e", "d"]);
    expect(
      Object.values(byDay)
        .flat()
        .some((t) => t.id === "g")
    ).toBe(false);
  });

  it("widok przesunięty w przeszłość: zadania przed zakresem, ale po dziś, nie są zaległe", () => {
    const pastDays = weekDays(new Date(2026, 10, 5));
    const { overdue } = splitWeekTasks([task({ id: "x", due_date: "2026-11-01" })], pastDays, "2026-10-30");
    expect(overdue).toEqual([]);
  });
});

describe("groupEventsByDay", () => {
  it("wydarzenie wielodniowe w każdym obejmowanym dniu, kolejność wg początku", () => {
    const days = weekDays(new Date(2026, 10, 19));
    const byDay = groupEventsByDay(
      [
        event({ id: "late", start_time: "2026-11-19T18:00:00+00", end_time: "2026-11-19T19:00:00+00" }),
        event({ id: "trip", start_time: "2026-11-18T10:00:00+00", end_time: "2026-11-20T12:00:00+00" }),
      ],
      days
    );
    expect(byDay["2026-11-18"].map((e) => e.id)).toEqual(["trip"]);
    expect(byDay["2026-11-19"].map((e) => e.id)).toEqual(["trip", "late"]);
    expect(byDay["2026-11-20"].map((e) => e.id)).toEqual(["trip"]);
    expect(byDay["2026-11-21"]).toEqual([]);
  });
});

describe("isMovableEvent", () => {
  it("blokuje serie, urodziny/imieniny i wpisy bez id z bazy", () => {
    expect(isMovableEvent(event({}))).toBe(true);
    expect(isMovableEvent(event({ id: "e1_2026-11-19", repeat: "weekly" }))).toBe(false);
    expect(isMovableEvent(event({ id: "bday_p1" }))).toBe(false);
    expect(isMovableEvent(event({ id: "nday_p1" }))).toBe(false);
    expect(isMovableEvent(event({ id: "temp-1" }))).toBe(false);
  });
});

describe("moveTaskToDay", () => {
  it("zmienia termin i zachowuje godzinę zaplanowania", () => {
    expect(moveTaskToDay(task({ scheduled_time: "2026-11-19T14:30:00+00" }), "2026-11-23")).toEqual({
      due_date: "2026-11-23",
      scheduled_time: "2026-11-23T14:30:00+00",
    });
  });

  it("zadanie bez godziny zostaje bez godziny", () => {
    expect(moveTaskToDay(task({ scheduled_time: null }), "2026-11-23")).toEqual({
      due_date: "2026-11-23",
      scheduled_time: null,
    });
  });
});

describe("moveEventToDay", () => {
  it("przesuwa o różnicę dni kolumn, z zachowaniem godzin i czasu trwania (także wielodniowe)", () => {
    expect(
      moveEventToDay(
        { start_time: "2026-11-18T22:00:00+00", end_time: "2026-11-19T01:00:00+00" },
        "2026-11-19",
        "2026-11-21"
      )
    ).toEqual({ start_time: "2026-11-20T22:00:00+00", end_time: "2026-11-21T01:00:00+00" });
  });

  it("przez zmianę czasu godzina zegarowa się nie zmienia", () => {
    expect(
      moveEventToDay(
        { start_time: "2026-10-23T09:00:00+00", end_time: "2026-10-23T10:00:00+00" },
        "2026-10-23",
        "2026-10-26"
      )
    ).toEqual({ start_time: "2026-10-26T09:00:00+00", end_time: "2026-10-26T10:00:00+00" });
  });

  it("nieprawidłowy zapis czasu: null", () => {
    expect(moveEventToDay({ start_time: "x", end_time: "y" }, "2026-11-19", "2026-11-20")).toBeNull();
  });
});
