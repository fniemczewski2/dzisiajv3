// __tests__/pages/api/locality.test.ts

import { describe, it, expect } from "vitest";
import { parseCoord, pickLocality } from "@/pages/api/transport/locality";

describe("locality helpers", () => {
  it("parses coordinates strictly and within bounds", () => {
    expect(parseCoord("52.347", 49, 55)).toBeCloseTo(52.347, 6);
    expect(parseCoord("60", 49, 55)).toBeNull();
    expect(parseCoord("52.3; DROP", 49, 55)).toBeNull();
    expect(parseCoord(["52"], 49, 55)).toBeNull();
  });

  it("prefers city, then smaller units", () => {
    expect(pickLocality({ properties: { city: "Luboń", county: "powiat poznański" } })).toBe("Luboń");
    expect(pickLocality({ properties: { village: "Wiry" } })).toBe("Wiry");
    expect(pickLocality(undefined)).toBeNull();
  });
});
