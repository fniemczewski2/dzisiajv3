// __tests__/lib/trainPunctuality.test.ts

import { describe, it, expect } from "vitest";
import { describeFinalPunctuality, describeTrainPunctuality } from "@/lib/trainPunctuality";

describe("describeTrainPunctuality – jeden opis dla planu dnia i widoku Pociągi", () => {
  it("opóźnienie zawsze z jednostką", () => {
    expect(describeTrainPunctuality({ status: "Opóźniony", delay: 12 })).toEqual({
      kind: "delayed",
      label: "+ 12 min",
    });
  });

  it("odwołanie i częściowe odwołanie", () => {
    expect(describeTrainPunctuality({ status: "Odwołany", delay: 0 }).label).toBe("Odwołany");
    // Częściowe odwołanie nie ma już osobnego opisu: oba statusy dają „Odwołany”.
    expect(describeTrainPunctuality({ status: "Cz. odwołany", delay: 0 })).toEqual({
      kind: "cancelled",
      label: "Odwołany",
    });
  });

  it("brak danych nie jest punktualnością (wcześniej plan pokazywał „Planowo”)", () => {
    for (const status of ["Brak danych", "Brak danych live", "Nie zidentyfikowano stacji", "Błąd połączenia", ""]) {
      expect(describeTrainPunctuality({ status, delay: 0 })).toEqual({
        kind: "noData",
        label: "B/d",
      });
    }
    expect(describeTrainPunctuality({ status: "Zbyt wiele zapytań", delay: 0 }).label).toBe("B/d (limit)");
  });

  it("bez opóźnienia tylko przy statusie przejazdu", () => {
    expect(describeTrainPunctuality({ status: "Nie zaczął", delay: 0 })).toEqual({
      kind: "onTime",
      label: "Na czas",
    });
    expect(describeTrainPunctuality({ status: "W trasie", delay: 0 }).label).toBe("W trasie");
  });

  it("przed oknem śledzenia: informacja zamiast oceny", () => {
    expect(describeTrainPunctuality({ status: "Nie zaczął", delay: 0, tracked: false })).toEqual({
      kind: "notTracked",
      label: "Wkrótce...",
    });
  });
});

describe("describeFinalPunctuality", () => {
  it("brak znacznika zapisu = brak wyniku", () => {
    expect(describeFinalPunctuality({ finalDelay: 0 })).toBeNull();
  });

  it("zapisane opóźnienie przyjazdu", () => {
    const out = describeFinalPunctuality({ finalDelay: 12, finalRecordedAt: "2026-11-23T10:00:00Z" });
    expect(out).toEqual({ kind: "delayed", label: "+ 12 min (przyjazd)" });
  });

  it("zero minut po zapisie znaczy na czas", () => {
    const out = describeFinalPunctuality({ finalDelay: 0, finalRecordedAt: "2026-11-23T10:00:00Z" });
    expect(out).toEqual({ kind: "onTime", label: "Na czas (przyjazd)" });
  });

  it("odwołany pociąg zostaje odwołany", () => {
    const out = describeFinalPunctuality({ finalStatus: "Odwołany", finalRecordedAt: "2026-11-23T10:00:00Z" });
    expect(out?.kind).toBe("cancelled");
  });
});

describe("describeTrainPunctuality – przejazd odbyty", () => {
  it("po przejeździe bez danych nie pokazuje „Wkrótce...”", () => {
    const out = describeTrainPunctuality({ status: "", delay: 0, tracked: false, finished: true });
    expect(out).toEqual({ kind: "noData", label: "B/d" });
  });

  it("przed przejazdem nadal „Wkrótce...”", () => {
    const out = describeTrainPunctuality({ status: "", delay: 0, tracked: false });
    expect(out.label).toBe("Wkrótce...");
  });
});
