// __tests__/lib/icsGenerator.test.ts

import { describe, it, expect } from "vitest";
import ICAL from "ical.js";
import { buildSingleEventICS } from "@/lib/icsGenerator";
import type { Event } from "@/types/events";

const event = {
  id: "ev 1",
  title: "Zebranie: budżet, plan; wolontariat",
  description: "Porządek:\n1. Budżet\n2. Wolontariat \\ rekrutacja",
  place: "Sala 3, ul. Długa 1",
  start_time: "2026-11-02T10:00:00",
  end_time: "2026-11-02T11:30:00",
  user_id: "11111111-1111-4111-8111-111111111111",
} as Event;

function parse(ics: string) {
  return new ICAL.Component(ICAL.parse(ics)).getFirstSubcomponent("vevent") as ICAL.Component;
}

describe("buildSingleEventICS", () => {
  it("tekst ze znakami specjalnymi wraca bez zmian (bez podwójnej ucieczki)", () => {
    const vevent = parse(buildSingleEventICS(event, new Date("2026-11-01T12:00:00Z")));
    expect(vevent.getFirstPropertyValue("summary")).toBe(event.title);
    expect(vevent.getFirstPropertyValue("description")).toBe(event.description);
    expect(vevent.getFirstPropertyValue("location")).toBe(event.place);
  });

  it("nie zawiera identyfikatora użytkownika ani pola ORGANIZER", () => {
    const ics = buildSingleEventICS(event);
    expect(ics).not.toContain(event.user_id);
    expect(ics).not.toMatch(/ORGANIZER/i);
  });

  it("UID bez spacji i godziny początku/końca zgodne z wydarzeniem", () => {
    const vevent = parse(buildSingleEventICS(event));
    expect(vevent.getFirstPropertyValue("uid")).toBe("ev_1");
    const start = vevent.getFirstPropertyValue("dtstart") as ICAL.Time;
    const end = vevent.getFirstPropertyValue("dtend") as ICAL.Time;
    expect([start.hour, start.minute, end.hour, end.minute]).toEqual([10, 0, 11, 30]);
  });

  it("puste pola opcjonalne nie tworzą właściwości", () => {
    const vevent = parse(buildSingleEventICS({ ...event, description: "", place: "" }));
    expect(vevent.getFirstProperty("description")).toBeNull();
    expect(vevent.getFirstProperty("location")).toBeNull();
  });
});
