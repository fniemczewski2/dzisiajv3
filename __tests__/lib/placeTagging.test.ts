import { describe, it, expect } from "vitest";
import {
  RATING_TO_TAGS,
  extractTagsFromGooglePlace,
  analyzeNameForTags,
  generatePlaceTags,
} from "@/lib/placeTagging";

describe("RATING_TO_TAGS", () => {
  it("tags a 4.5+ place as 'kultowe' and 'polecane'", () => {
    expect(RATING_TO_TAGS(4.7)).toEqual(["kultowe", "polecane"]);
  });

  it("tags a 4.0-4.49 place as only 'polecane'", () => {
    expect(RATING_TO_TAGS(4.2)).toEqual(["polecane"]);
  });

  it("returns no tags below 4.0", () => {
    expect(RATING_TO_TAGS(3.9)).toEqual([]);
  });
});

describe("extractTagsFromGooglePlace", () => {
  it("maps a known Google place type to its tags", () => {
    const tags = extractTagsFromGooglePlace({ types: ["cafe"] });
    expect(tags.length).toBeGreaterThan(0);
  });

  it("adds a price-level tag when price_level is present", () => {
    const tags = extractTagsFromGooglePlace({ price_level: 3 });
    expect(tags).toEqual(expect.arrayContaining(["premium", "drogo"]));
  });

  it("adds rating-based tags for a highly rated place", () => {
    const tags = extractTagsFromGooglePlace({ rating: 4.8 });
    expect(tags).toEqual(expect.arrayContaining(["kultowe", "polecane"]));
  });

  it("adds a 24h tag when a period has no closing time", () => {
    const tags = extractTagsFromGooglePlace({
      opening_hours: { periods: [{ open: { time: "0000" } }] },
    });
    expect(tags).toContain("24h");
  });

  it("does not add a 24h tag when every period has a closing time", () => {
    const tags = extractTagsFromGooglePlace({
      opening_hours: {
        periods: [{ open: { time: "0800" }, close: { time: "2000" } }],
      },
    });
    expect(tags).not.toContain("24h");
  });

  it("never returns duplicate tags even when multiple signals overlap", () => {
    const tags = extractTagsFromGooglePlace({ types: ["cafe"], rating: 4.9 });
    expect(new Set(tags).size).toBe(tags.length);
  });

  it("returns an empty array for a place with no recognizable signals", () => {
    expect(extractTagsFromGooglePlace({})).toEqual([]);
  });
});

describe("analyzeNameForTags", () => {
  it("recognizes a fast-food chain regardless of case", () => {
    expect(analyzeNameForTags("McDonald's Warszawa Centrum")).toEqual(
      expect.arrayContaining(["sieciówka", "fast food"])
    );
  });

  it("recognizes a coffee-shop chain", () => {
    expect(analyzeNameForTags("Starbucks Reserve")).toEqual(
      expect.arrayContaining(["sieciówka", "kawiarnia"])
    );
  });

  it("returns no tags for a name matching no known chain", () => {
    expect(analyzeNameForTags("Zapiecek u Marka")).toEqual([]);
  });
});

describe("generatePlaceTags", () => {
  it("combines Google place data and name-based signals, sorted and deduplicated", async () => {
    const tags = await generatePlaceTags("Starbucks Rynek", { rating: 4.6 });
    expect(tags).toEqual(expect.arrayContaining(["sieciówka", "kawiarnia", "kultowe", "polecane"]));
    expect(new Set(tags).size).toBe(tags.length);
    // posortowane wg polskiego locale
    expect(tags).toEqual([...tags].sort((a, b) => a.localeCompare(b, "pl")));
  });

  it("works from just a name when no Google data is available", async () => {
    const tags = await generatePlaceTags("Subway Dworzec");
    expect(tags).toEqual(expect.arrayContaining(["sieciówka", "fast food"]));
  });
});
