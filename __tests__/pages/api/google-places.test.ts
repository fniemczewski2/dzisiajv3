import { describe, it, expect } from "vitest";
import { parseLatLng, parseSingleString } from "@/pages/api/google-places";

describe("parseLatLng", () => {
  it("parses valid coordinates", () => {
    expect(parseLatLng("52.2297", "21.0122")).toEqual({ lat: 52.2297, lng: 21.0122 });
  });

  it("rejects a latitude outside [-90, 90]", () => {
    expect(parseLatLng("91", "21.0122")).toBeNull();
  });

  it("rejects a longitude outside [-180, 180]", () => {
    expect(parseLatLng("52.2297", "181")).toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(parseLatLng("north", "east")).toBeNull();
  });

  it("rejects an array value (repeated query param)", () => {
    expect(parseLatLng(["52.2297", "52.1"], "21.0122")).toBeNull();
  });

  it("rejects missing values", () => {
    expect(parseLatLng(undefined, "21.0122")).toBeNull();
  });
});

describe("parseSingleString", () => {
  it("returns the string when it is non-empty", () => {
    expect(parseSingleString("Warszawa")).toBe("Warszawa");
  });

  it("returns null for an empty or whitespace-only string", () => {
    expect(parseSingleString("")).toBeNull();
    expect(parseSingleString("   ")).toBeNull();
  });

  it("returns null for a non-string value (e.g. repeated query param)", () => {
    expect(parseSingleString(["a", "b"])).toBeNull();
    expect(parseSingleString(undefined)).toBeNull();
  });
});
