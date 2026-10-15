// __tests__/lib/bulkEvents.test.ts

import { describe, it, expect } from "vitest";
import { parseBulkEvents, eventEndTime } from "@/lib/bulkEvents";
import { parseStudyDates } from "@/lib/zjazdyParser";

const now = new Date(2026, 9, 10);

describe("parseBulkEvents", () => {
  it("data, godziny i nazwa z jednej linii", () => {
    const [e] = parseBulkEvents("15.10.2026 10:00–12:00 Zarząd fundacji", now);
    expect(e).toMatchObject({ start: "2026-10-15", end: "2026-10-15", startTime: "10:00", endTime: "12:00", title: "Zarząd fundacji" });
  });

  it("różne kolejności i separatory", () => {
    const list = parseBulkEvents(
      ["Warsztaty dostępności – 7 listopada 2026, godz. 9:30", "Konferencja NGO | 20-22.11.2026", "Urlop: 1–10.12.2026", "17-18.10"].join("\n"),
      now
    );
    expect(list.map((e) => [e.title, e.start, e.end, e.startTime])).toEqual([
      ["Warsztaty dostępności", "2026-11-07", "2026-11-07", "09:30"],
      ["Konferencja NGO", "2026-11-20", "2026-11-22", null],
      ["Urlop", "2026-12-01", "2026-12-10", null],
      ["", "2026-10-17", "2026-10-18", null], // bez nazwy – użyj domyślnej
    ]);
  });

  it("linie bez daty pomija, ale rok z nich się liczy", () => {
    const list = parseBulkEvents("Semestr letni 2026/2027\nZjazd 1: 13-14.03\nNotatka bez daty", now);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ start: "2027-03-13", title: "Zjazd 1" });
  });

  it("kilka dat w linii – kilka wydarzeń o tej samej nazwie", () => {
    const list = parseBulkEvents("Dyżur: 5.10.2026, 12.10.2026", now);
    expect(list.map((e) => e.start)).toEqual(["2026-10-05", "2026-10-12"]);
    expect(list.every((e) => e.title === "Dyżur")).toBe(true);
  });

  it("koniec domyślnie godzinę po starcie", () => {
    expect(eventEndTime("10:00", null)).toBe("11:00");
    expect(eventEndTime("23:30", null)).toBe("23:59");
    expect(eventEndTime("10:00", "09:00")).toBe("11:00");
  });

  it("import zjazdów działa jak dotąd (limit 4 dni)", () => {
    expect(parseStudyDates("1-20.10.2026", now)).toEqual([]);
  });
});
