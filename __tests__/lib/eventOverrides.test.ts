// __tests__/lib/eventOverrides.test.ts
//
// Wyjątek jednego terminu serii: to wystąpienie ma własny termin (także w innym dniu),
// a kolejne wypadają zgodnie z regułą.

import { describe, it, expect } from "vitest";
import { expandRepeatingEvents, seriesOccurrence } from "@/lib/eventUtils";
import type { Event, EventOverride } from "@/types/events";

// Poniedziałki 10:00–11:00, od 2 listopada 2026 (poniedziałek).
const series = {
  id: "e1",
  title: "Zebranie",
  user_id: "u1",
  repeat: "weekly",
  recurrence: { freq: "weekly", interval: 1 },
  start_time: "2026-11-02T10:00:00+00",
  end_time: "2026-11-02T11:00:00+00",
} as Event;

const week = (): [Date, Date] => [new Date(2026, 10, 9, 0, 0, 0), new Date(2026, 10, 15, 23, 59, 59)];

describe("seriesOccurrence", () => {
  it("rozbija id wystąpienia na serię i dzień siatki", () => {
    expect(seriesOccurrence("e1_2026-11-09")).toEqual({ seriesId: "e1", occurrenceDate: "2026-11-09" });
  });

  it("zwykłe wydarzenie, urodziny i wpis tymczasowy to nie wystąpienia", () => {
    expect(seriesOccurrence("e1")).toBeNull();
    expect(seriesOccurrence("bday_p1")).toBeNull();
    expect(seriesOccurrence("temp-123")).toBeNull();
  });
});

describe("expandRepeatingEvents – wyjątki terminów", () => {
  it("bez wyjątków: poniedziałek 9 listopada o 10:00", () => {
    const [from, to] = week();
    const out = expandRepeatingEvents([series], from, to);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("e1_2026-11-09");
    expect(out[0].start_time).toBe("2026-11-09T10:00:00+00");
  });

  it("wyjątek przenosi ten jeden termin na środę, reguła zostaje", () => {
    const override: EventOverride = {
      event_id: "e1",
      occurrence_date: "2026-11-09",
      start_time: "2026-11-11T14:00:00+00",
      end_time: "2026-11-11T15:00:00+00",
    };
    const [from, to] = week();
    const moved = expandRepeatingEvents([series], from, to, [override]);
    expect(moved).toHaveLength(1);
    expect(moved[0].start_time).toBe("2026-11-11T14:00:00+00");

    // Następny tydzień: znów poniedziałek 10:00.
    const next = expandRepeatingEvents([series], new Date(2026, 10, 16), new Date(2026, 10, 22, 23, 59, 59), [
      override,
    ]);
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe("e1_2026-11-16");
    expect(next[0].start_time).toBe("2026-11-16T10:00:00+00");
  });

  it("odwołany termin znika z widoku, a kolejny zostaje", () => {
    const canceled: EventOverride = {
      event_id: "e1",
      occurrence_date: "2026-11-09",
      start_time: "2026-11-09T10:00:00+00",
      end_time: "2026-11-09T11:00:00+00",
      canceled: true,
    };
    const [from, to] = week();
    expect(expandRepeatingEvents([series], from, to, [canceled])).toHaveLength(0);
    const next = expandRepeatingEvents([series], new Date(2026, 10, 16), new Date(2026, 10, 22, 23, 59, 59), [
      canceled,
    ]);
    expect(next.map((e) => e.id)).toEqual(["e1_2026-11-16"]);
  });

  it("termin przeniesiony z dnia przed zakresem trafia do widoku, a poza zakres – znika z niego", () => {
    const override: EventOverride = {
      event_id: "e1",
      occurrence_date: "2026-11-02",
      start_time: "2026-11-10T09:00:00+00",
      end_time: "2026-11-10T10:00:00+00",
    };
    const [from, to] = week();
    const out = expandRepeatingEvents([series], from, to, [override]);
    const ids = out.map((e) => e.id);
    expect(ids).toContain("e1_2026-11-02");
    expect(ids).toContain("e1_2026-11-09");

    const previousWeek = expandRepeatingEvents([series], new Date(2026, 10, 2), new Date(2026, 10, 8, 23, 59, 59), [
      override,
    ]);
    expect(previousWeek).toHaveLength(0);
  });
});
