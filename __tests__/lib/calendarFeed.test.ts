// __tests__/lib/calendarFeed.test.ts

import { describe, it, expect } from "vitest";
import { buildCalendarFeed, escapeIcsText, feedRange, foldLine } from "@/lib/calendarFeed";
import type { Event } from "@/types/events";
import type { Task } from "@/types/tasks";
import type { Schema } from "@/types/schemas";

const unfold = (ics: string) => ics.replaceAll("\r\n ", "");

describe("calendarFeed – format", () => {
  it("ucieczka znaków RFC 5545", () => {
    expect(escapeIcsText("a,b;c\\d\ne")).toBe(String.raw`a\,b\;c\\d\ne`);
  });

  it("zawija długie linie do 75 oktetów, nie dzieląc znaków UTF-8", () => {
    const line = `SUMMARY:${"ż".repeat(60)}`;
    const folded = foldLine(line);
    for (const part of folded.split("\r\n")) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.replaceAll("\r\n ", "")).toBe(line);
  });

  it("zakres: 30 dni wstecz, 90 naprzód", () => {
    expect(feedRange("2026-11-20")).toEqual({ from: "2026-10-21", to: "2027-02-18" });
  });
});

describe("buildCalendarFeed", () => {
  const event: Event = {
    id: "e1",
    title: "Zarząd fundacji",
    start_time: "2026-11-20T18:00:00+00",
    end_time: "2026-11-20T19:30:00+00",
    user_id: "u",
    repeat: "none",
    place: "Poznań, ul. Długa 1",
  };
  const task: Task = {
    id: "t1",
    title: "Rozliczyć dotację",
    category: "praca",
    priority: 1,
    description: "",
    due_date: "2026-11-21",
    status: "pending",
    user_id: "u",
  };
  const schema: Schema = { id: "s1", name: "Dzień", days: [4], entries: [{ time: "07:30", label: "Spacer" }] };

  const ics = unfold(
    buildCalendarFeed({
      events: [event],
      tasks: [task, { ...task, id: "t2", status: "done" }],
      schemas: [schema],
      schemaChoices: new Map(),
      overrides: new Map([["2026-11-27", [{ schema_id: "schema-0", is_hidden: true }]]]),
      from: "2026-11-20",
      to: "2026-11-30",
      now: new Date("2026-11-20T10:00:00Z"),
      uidDomain: "dzisiaj.fun",
    })
  );

  it("wydarzenie w czasie ściennym ze strefą Europe/Warsaw i VTIMEZONE", () => {
    expect(ics).toContain("BEGIN:VTIMEZONE\r\nTZID:Europe/Warsaw");
    expect(ics).toContain("DTSTART;TZID=Europe/Warsaw:20261120T180000");
    expect(ics).toContain(String.raw`LOCATION:Poznań\, ul. Długa 1`);
  });

  it("zadanie bez godziny jako wpis całodniowy; zakończone pominięte", () => {
    expect(ics).toContain("UID:task-t1@dzisiaj.fun");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261121");
    expect(ics).not.toContain("task-t2");
  });

  it("rutyny w dniach schematu z wyjątkami (ukrycie)", () => {
    expect(ics).toContain("UID:routine-s1-0-2026-11-20@dzisiaj.fun");
    expect(ics).not.toContain("routine-s1-0-2026-11-27");
  });

  it("CRLF i zamknięcie kalendarza", () => {
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});
