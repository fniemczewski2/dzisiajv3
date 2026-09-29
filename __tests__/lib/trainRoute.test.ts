import { describe, expect, it } from "vitest";
import { normalizeStationName, resolveRouteStations, stationMatchScore } from "@/lib/trainRoute";

const names: Record<string, string> = {
  POZ: "Poznań Główny",
  WRZ: "Września",
  KON: "Konin",
  KUT: "Kutno",
  WZA: "Warszawa Zachodnia",
  WCE: "Warszawa Centralna",
  WWS: "Warszawa Wschodnia",
};
const route = ["POZ", "WRZ", "KON", "KUT", "WZA", "WCE", "WWS"];
const nameOf = (id: string) => names[id];

describe("normalizeStationName", () => {
  it("rozwija skróty z biletów", () => {
    expect(normalizeStationName("Poznań Gł.")).toBe("poznań główny");
    expect(normalizeStationName("Warszawa Wsch.")).toBe("warszawa wschodnia");
    expect(normalizeStationName("Warszawa Centr")).toBe("warszawa centralna");
  });
});

describe("resolveRouteStations", () => {
  it("wybiera stację docelową z biletu, a nie kolejny przystanek", () => {
    const r = resolveRouteStations(route, nameOf, { id: "POZ", query: "Poznań Gł." }, { id: "WRZ", query: "Warszawa Centralna" });
    expect(r.toStationId).toBe("WCE");
  });

  it("przy samej nazwie miasta bierze najlepiej pasującą stację za stacją wyjazdu", () => {
    const r = resolveRouteStations(route, nameOf, { id: "POZ", query: "Poznań" }, { id: null, query: "Warszawa Wsch." });
    expect(r.toStationId).toBe("WWS");
  });

  it("nie wybiera stacji leżącej przed stacją wyjazdu", () => {
    const r = resolveRouteStations(route, nameOf, { id: "KUT", query: "Kutno" }, { id: null, query: "Konin" });
    expect(r.toStationId).toBeNull();
  });

  it("identyfikator ze słownika wygrywa z częściowym dopasowaniem nazwy", () => {
    expect(stationMatchScore("Warszawa Zachodnia", "Warszawa")).toBe(3);
    const r = resolveRouteStations(route, nameOf, { id: "POZ", query: "Poznań" }, { id: "WCE", query: "Warszawa" });
    expect(r.toStationId).toBe("WCE");
  });
});
