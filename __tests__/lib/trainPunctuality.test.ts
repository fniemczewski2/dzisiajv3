// __tests__/lib/trainPunctuality.test.ts

import { describe, it, expect } from "vitest";
import { describeTrainPunctuality } from "@/lib/trainPunctuality";

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
