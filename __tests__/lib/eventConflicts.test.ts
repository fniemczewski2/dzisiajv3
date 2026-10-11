// __tests__/lib/eventConflicts.test.ts

import { describe, it, expect } from "vitest";
import { findConflicts, isAllDayEvent, overlappingEventIds, rangesOverlap } from "@/lib/eventConflicts";
import { expandRepeatingEvents } from "@/lib/eventUtils";
import type { Event } from "@/types/events";

const ev = (id: string, start: string, end: string, overrides: Partial<Event> = {}): Event => ({
  id,
  user_id: "me",
  title: `Wydarzenie ${id}`,
  start_time: `${start}+00`,
  end_time: `${end}+00`,
  repeat: "none",
  ...overrides,
});

const at = (s: string) => new Date(s);

describe("rangesOverlap", () => {
  it("stykające się terminy nie kolidują", () => {
    expect(rangesOverlap(at("2026-10-12T10:00"), at("2026-10-12T11:00"), at("2026-10-12T11:00"), at("2026-10-12T12:00"))).toBe(false);
  });
  it("częściowe nakładanie to kolizja", () => {
    expect(rangesOverlap(at("2026-10-12T10:00"), at("2026-10-12T11:00"), at("2026-10-12T10:30"), at("2026-10-12T12:00"))).toBe(true);
  });
});

describe("findConflicts", () => {
  const existing = [
    ev("a", "2026-10-12T10:00:00", "2026-10-12T11:00:00"),
    ev("b", "2026-10-12T13:00:00", "2026-10-12T14:00:00"),
    ev("c", "2026-10-12T00:00:00", "2026-10-12T23:59:00", { title: "Konferencja" }),
    ev("bday_1_2026-10-12", "2026-10-12T00:00:00", "2026-10-12T23:59:59"),
  ];

  it("zgłasza nakładające się spotkanie i osobno wydarzenie całodniowe", () => {
    const r = findConflicts(at("2026-10-12T10:30"), at("2026-10-12T11:30"), existing);
    expect(r.overlaps.map((c) => c.event.id)).toEqual(["a"]);
    expect(r.allDay.map((c) => c.event.title)).toEqual(["Konferencja"]);
  });

  it("pomija wirtualne urodziny", () => {
    const r = findConflicts(at("2026-10-12T09:00"), at("2026-10-12T09:30"), existing);
    expect(r.allDay.some((c) => c.event.id.startsWith("bday_"))).toBe(false);
  });

  it("nie zgłasza edytowanego wydarzenia jako kolizji z samym sobą", () => {
    const r = findConflicts(at("2026-10-12T10:00"), at("2026-10-12T11:00"), existing, { ignoreId: "a" });
    expect(r.overlaps).toHaveLength(0);
  });

  it("nowe wydarzenie całodniowe nie ostrzega o każdym spotkaniu", () => {
    const r = findConflicts(at("2026-10-12T00:00"), at("2026-10-12T23:59"), existing, { candidateAllDay: true });
    expect(r.overlaps).toHaveLength(0);
    expect(r.allDay).toHaveLength(1);
  });

  it("wykrywa kolizję z wydarzeniem cyklicznym z poprzednich tygodni", () => {
    const weekly = ev("w", "2026-09-07T10:00:00", "2026-09-07T11:00:00", { repeat: "weekly" }); // poniedziałki
    const r = findConflicts(at("2026-10-12T10:15"), at("2026-10-12T10:45"), [weekly]);
    expect(r.overlaps).toHaveLength(1);
    expect(r.overlaps[0].end.getHours()).toBe(11);
  });

  it("zwraca pusty raport dla niepoprawnego zakresu", () => {
    expect(findConflicts(at("2026-10-12T11:00"), at("2026-10-12T10:00"), existing).overlaps).toHaveLength(0);
  });
});

describe("overlappingEventIds", () => {
  it("oznacza tylko nakładające się wydarzenia z godziną", () => {
    const ids = overlappingEventIds([
      ev("a", "2026-10-12T10:00:00", "2026-10-12T11:00:00"),
      ev("b", "2026-10-12T10:30:00", "2026-10-12T12:00:00"),
      ev("c", "2026-10-12T12:00:00", "2026-10-12T13:00:00"),
      ev("d", "2026-10-12T00:00:00", "2026-10-12T23:59:00"),
    ]);
    expect([...ids].sort()).toEqual(["a", "b"]);
  });
});

describe("isAllDayEvent", () => {
  it("rozpoznaje zapis 00:00–23:59", () => {
    expect(isAllDayEvent(ev("x", "2026-10-12T00:00:00", "2026-10-12T23:59:00"))).toBe(true);
    expect(isAllDayEvent(ev("y", "2026-10-12T09:00:00", "2026-10-12T17:00:00"))).toBe(false);
  });
});

describe("expandRepeatingEvents – godzina końca", () => {
  it("cotygodniowe 10:00–11:00 zachowuje godzinę zakończenia", () => {
    const weekly = ev("w", "2026-09-07T10:00:00", "2026-09-07T11:00:00", { repeat: "weekly" });
    const [instance] = expandRepeatingEvents([weekly], at("2026-10-12T00:00"), at("2026-10-12T23:59"));
    expect(instance.start_time).toBe("2026-10-12T10:00:00+00");
    expect(instance.end_time).toBe("2026-10-12T11:00:00+00");
  });
});
