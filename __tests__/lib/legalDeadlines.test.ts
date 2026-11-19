// __tests__/lib/legalDeadlines.test.ts

import { describe, it, expect } from "vitest";
import { isNonWorkingDay, nextWorkingDay, rawTermEnd, termEnd } from "@/lib/legalDeadlines";
import { suggestResponseDate } from "@/hooks/db/useLetters";

describe("art. 57 KPA – obliczanie terminów", () => {
  it("dni: bez dnia zdarzenia (§ 1)", () => {
    expect(rawTermEnd("2026-11-02", 14, "days")).toBe("2026-11-16");
  });

  it("tygodnie: ten sam dzień tygodnia (§ 2)", () => {
    expect(rawTermEnd("2026-11-04", 6, "weeks")).toBe("2026-12-16");
  });

  it("miesiące: ten sam dzień, a gdy go brak – ostatni dzień miesiąca (§ 3)", () => {
    expect(rawTermEnd("2026-03-15", 1, "months")).toBe("2026-04-15");
    expect(rawTermEnd("2026-01-31", 1, "months")).toBe("2026-02-28");
    expect(rawTermEnd("2028-01-31", 1, "months")).toBe("2028-02-29");
    expect(rawTermEnd("2026-12-31", 2, "months")).toBe("2027-02-28");
  });

  it("koniec w sobotę lub dzień wolny przesuwa się na dzień roboczy (§ 4)", () => {
    // 2026-11-14 to sobota → poniedziałek 16.11.
    expect(termEnd("2026-10-31", 14, "days")).toBe("2026-11-16");
    // 11.11.2026 (środa, święto) → 12.11.
    expect(nextWorkingDay("2026-11-11")).toBe("2026-11-12");
    // 24–27.12.2026: Wigilia, święta, sobota, niedziela → 28.12.
    expect(nextWorkingDay("2026-12-24")).toBe("2026-12-28");
  });

  it("Wigilia jest dniem wolnym dopiero od 2025 r.", () => {
    expect(isNonWorkingDay("2024-12-24")).toBe(false);
    expect(isNonWorkingDay("2025-12-24")).toBe(true);
  });

  it("niepoprawna data → null", () => {
    expect(termEnd("2026-02-30", 1, "months")).toBeNull();
    expect(termEnd("x", 1, "days")).toBeNull();
  });
});

describe("suggestResponseDate", () => {
  it("UDIP: 14 dni, wariant przedłużenia: 2 miesiące", () => {
    expect(suggestResponseDate("UDIP", "2026-03-02")).toBe("2026-03-16");
    expect(suggestResponseDate("UDIP", "2026-03-02", "udip-2m")).toBe("2026-05-04");
  });

  it("skarga i wniosek: miesiąc, nie 31 dni", () => {
    expect(suggestResponseDate("Skarga", "2026-02-02")).toBe("2026-03-02");
    expect(suggestResponseDate("Wniosek", "2026-02-02")).toBe("2026-03-02");
  });

  it("przestępstwo: 6 tygodni (art. 306 § 3 KPK)", () => {
    expect(suggestResponseDate("Przestępstwo", "2026-11-04")).toBe("2026-12-16");
  });

  it("nie przesuwa daty o dzień przez strefę czasową", () => {
    expect(suggestResponseDate("Skarga", "2026-04-01")).toBe("2026-05-04");
  });

  it("„Inne” – bez propozycji", () => {
    expect(suggestResponseDate("Inne", "2026-04-01")).toBeNull();
  });
});
