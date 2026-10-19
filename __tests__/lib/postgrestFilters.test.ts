// __tests__/lib/postgrestFilters.test.ts

import { describe, expect, it } from "vitest";
import {
  assertUuid,
  containsPattern,
  escapeLikePattern,
  InvalidFilterValueError,
  ownedOrSharedFilter,
  quotedIsoTimestamp,
} from "@/lib/postgrestFilters";

const ID = "0b8f4c3e-7a2d-4e1b-9c5f-1234567890ab";

describe("filtry PostgREST", () => {
  it("przepuszcza poprawny UUID i odrzuca próbę dopisania warunku", () => {
    expect(assertUuid(ID)).toBe(ID);
    expect(() => assertUuid(`${ID},user_id.neq.x`)).toThrow(InvalidFilterValueError);
  });

  it("buduje filtr właściciel lub udostępnione", () => {
    expect(ownedOrSharedFilter("user_id", "shared_with_id", ID)).toBe(`user_id.eq.${ID},shared_with_id.eq.${ID}`);
  });

  it("cytuje datę ISO i odrzuca znaki sterujące filtrem", () => {
    expect(quotedIsoTimestamp("2026-10-18T10:00:00.000Z")).toBe('"2026-10-18T10:00:00.000Z"');
    expect(() => quotedIsoTimestamp('2026-10-18",id.gt.0')).toThrow(InvalidFilterValueError);
    expect(() => quotedIsoTimestamp("nie-data")).toThrow(InvalidFilterValueError);
  });

  it("escapuje znaki LIKE, także ukośnik wsteczny", () => {
    expect(escapeLikePattern(String.raw`50%_a\b`)).toBe(String.raw`50\%\_a\\b`);
    expect(containsPattern("  kot ")).toBe("%kot%");
  });
});
