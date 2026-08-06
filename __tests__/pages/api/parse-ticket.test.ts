// __tests__/pages/api/parse-ticket.test.ts

import { describe, it, expect } from "vitest";
import {
  parseTicketData,
  extractRoute,
  extractStationNames,
} from "@/pages/api/transport/parse-ticket";

const BILET_POZNAN_SZCZECINEK = [
  "BILET NR WN 60619392 KOD 5165",
  "PODRÓŻNY",
  "Franciszek",
  "Niemczewski",
  "CENA",
  "24,50 zł",
  "BILET",
  "1x STU/DOK",
  "Ulga 51%",
  "Poznań Gł. Szczecinek",
  "Data odjazdu / przyjazdu: 31.07.2026 31.07.2026",
  "Godzina odjazdu / przyjazdu: 13:40 15:51 Czas: 2g 11min",
  "Pociąg: 3806 Zefir",
  "Wagon: 17, klasa 2",
  "Miejsca: 88 ś Wagon bez przedziałów",
  "ś - środek",
  "Odległość taryfowa",
  "166 km",
].join("\n");

describe("parseTicketData", () => {
  it("wyciąga komplet danych z biletu PKP Intercity", () => {
    expect(parseTicketData(BILET_POZNAN_SZCZECINEK)).toEqual({
      trainNumber: "3806",
      trainName: "Zefir",
      date: "31.07.2026",
      departureTime: "13:40",
      wagon: "17",
      seat: "88",
      route: "Poznań Główny Szczecinek",
      from: "Poznań Główny",
      to: "Szczecinek",
    });
  });

  it("bierze godzinę odjazdu, a nie przyjazdu", () => {
    const { departureTime } = parseTicketData(BILET_POZNAN_SZCZECINEK);
    expect(departureTime).toBe("13:40");
    expect(departureTime).not.toBe("15:51");
  });

  it("nie wywraca się na tekście, który nie jest biletem", () => {
    const wynik = parseTicketData("Zwykły dokument bez żadnych danych podróży.");
    expect(wynik.trainNumber).toBe("");
    expect(wynik.from).toBe("");
  });
});

describe("extractRoute", () => {
  it("czyta trasę z linii poprzedzającej datę odjazdu", () => {
    expect(extractRoute(BILET_POZNAN_SZCZECINEK)).toBe("Poznań Gł. Szczecinek");
  });

  it("zwraca pusty string, gdy nie ma linii z datą odjazdu", () => {
    expect(extractRoute("Poznań Gł. Szczecinek")).toBe("");
  });
});

describe("extractStationNames", () => {
  it("rozwija skrót Gł. zgodnie z rodzajem nazwy miasta", () => {
    expect(extractStationNames("Poznań Gł. Szczecinek")).toEqual({
      from: "Poznań Główny",
      to: "Szczecinek",
    });
    expect(extractStationNames("Warszawa Centr. Kraków Gł.")).toEqual({
      from: "Warszawa Centralna",
      to: "Kraków Główny",
    });
  });

  it("radzi sobie z trasą bez skrótów", () => {
    expect(extractStationNames("Szczecinek Poznań")).toEqual({
      from: "Szczecinek",
      to: "Poznań",
    });
  });

  it("zwraca puste nazwy dla pustej trasy", () => {
    expect(extractStationNames("")).toEqual({ from: "", to: "" });
  });
});
