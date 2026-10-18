// __tests__/lib/zjazdyParser.test.ts

import { describe, it, expect } from "vitest";
import { parseStudyDates } from "@/lib/zjazdyParser";

const now = new Date(2026, 9, 10); // 10.10.2026 – rok akademicki 2026/27

describe("parseStudyDates", () => {
  it("zakres w jednym miesiącu z rokiem", () => {
    expect(parseStudyDates("Zjazd 1: 17-18.10.2026", now)).toEqual([
      { start: "2026-10-17", end: "2026-10-18", raw: "17-18.10.2026" },
    ]);
  });

  it("zakres przez przełom miesięcy i półpauza", () => {
    expect(parseStudyDates("31.10–01.11.2026", now).map((r) => [r.start, r.end])).toEqual([
      ["2026-10-31", "2026-11-01"],
    ]);
  });

  it("nazwy miesięcy i liczby rzymskie", () => {
    const r = parseStudyDates("7 i 8 listopada 2026\n12-13 XII 2026", now).map((x) => [x.start, x.end]);
    expect(r).toEqual([
      ["2026-11-07", "2026-11-08"],
      ["2026-12-12", "2026-12-13"],
    ]);
  });

  it("brak roku – rok z wcześniejszego tekstu albo rok akademicki", () => {
    expect(parseStudyDates("Semestr zimowy 2026/2027\n17-18.10\n16-17.01", now).map((r) => r.start)).toEqual([
      "2026-10-17",
      "2027-01-16",
    ]);
    expect(parseStudyDates("16-17.01", now)[0].start).toBe("2027-01-16");
  });

  it("tabela z kilkoma terminami, bez duplikatów i bez śmieci", () => {
    const table = "Lp.\tTermin\n1\t17-18.10.2026\n2\t7-8.11.2026\n3\t7-8.11.2026\nSala 3.14, godz. 8.00";
    expect(parseStudyDates(table, now).map((r) => r.start)).toEqual(["2026-10-17", "2026-11-07"]);
  });

  it("odrzuca nierealne daty i zbyt długie zakresy", () => {
    expect(parseStudyDates("31.02.2026, 1-20.10.2026", now)).toEqual([]);
  });
});
