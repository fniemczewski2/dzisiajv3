// __tests__/lib/ticketParser.test.ts
//
// Tekst biletu w formacie pdf-parse (PKP Intercity, bilet z przesiadką). Dane osobowe zastąpione.

import { describe, it, expect } from "vitest";
import { parseTicketData, parseTicketLegs, ticketDateToIso } from "@/lib/ticketParser";
import { legToRow } from "@/lib/server/ticketInbound";

const TWO_LEGS = [
  "PODRÓŻNY",
  "Jan",
  "Testowy CENA",
  "33,36 zł",
  "BILET",
  "BILET NR WN 00000001 KOD 0000",
  "1. odcinek: Poznań Gł. Kraków Gł.",
  "Data odjazdu / przyjazdu: 26.11.2026 26.11.2026",
  "Godzina odjazdu / przyjazdu: 16:31 21:34 Czas: 5g 3min",
  "Pociąg: 8304 Malczewski",
  "Wagon: 22, klasa 2",
  "Miejsca: 14 ś Wagon z przedziałami",
  "1 z 3 stron",
  "-- 1 of 3 --",
  "15min na przesiadkę",
  "BILET NR WN 00000002 KOD 0000",
  "2. odcinek:Kraków Gł. Warszawa Centr.",
  "Data odjazdu / przyjazdu: 26.11.2026 27.11.2026",
  "Godzina odjazdu / przyjazdu: 21:49 00:36 Czas: 2g 47min",
  "Pociąg: 3125 Łokietek",
  "Wagon: 3, klasa 2",
  "Miejsca: 93 ś Wagon bez przedziałów",
  "Składowe ceny",
  "1. odcinek:",
  "PRZEJAZD TAM",
].join("\n");

describe("parseTicketLegs", () => {
  it("bilet z przesiadką → dwa odcinki z osobnymi pociągami", () => {
    const legs = parseTicketLegs(TWO_LEGS);
    expect(legs).toHaveLength(2);
    expect(legs[0]).toMatchObject({
      trainNumber: "8304",
      trainName: "Malczewski",
      date: "26.11.2026",
      departureTime: "16:31",
      from: "Poznań Główny",
      to: "Kraków Główny",
      wagon: "22",
      seat: "14",
    });
    expect(legs[1]).toMatchObject({
      trainNumber: "3125",
      trainName: "Łokietek",
      departureTime: "21:49",
      from: "Kraków Główny",
      to: "Warszawa Centralna",
      wagon: "3",
      seat: "93",
    });
  });

  it("parseTicketData (wgrywanie PDF) bierze pierwszy odcinek bez prefiksu „1. odcinek:”", () => {
    expect(parseTicketData(TWO_LEGS).from).toBe("Poznań Główny");
  });

  it("legToRow: wpis z poczty do sprawdzenia; data ISO", () => {
    const row = legToRow("u1", parseTicketLegs(TWO_LEGS)[1]);
    expect(row).toMatchObject({ date: "2026-11-26", source: "mail", needs_review: true, user_id: "u1" });
    expect(ticketDateToIso("1.1.2026")).toBe("");
  });
});
