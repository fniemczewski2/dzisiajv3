// __tests__/lib/server/mailRoute.test.ts

import { describe, it, expect } from "vitest";
import { isUuid, isValidMessageId } from "@/lib/server/mailRoute";

describe("isValidMessageId", () => {
  it("przyjmuje identyfikator Gmaila i długi identyfikator Microsoft Graph", () => {
    expect(isValidMessageId("18c2f1a9b3e4d5f6")).toBe(true);
    const graphId = `AAMkAGI2TG93AAA${"x".repeat(140)}=`;
    expect(graphId.length).toBeGreaterThan(150);
    expect(isValidMessageId(graphId)).toBe(true);
  });
  it("odrzuca puste, zbyt długie i ze znakami spoza base64url", () => {
    expect(isValidMessageId("")).toBe(false);
    expect(isValidMessageId("a".repeat(257))).toBe(false);
    expect(isValidMessageId("../../etc")).toBe(false);
    expect(isValidMessageId("a b")).toBe(false);
    expect(isValidMessageId(42)).toBe(false);
  });
});

describe("isUuid", () => {
  it("rozpoznaje UUID", () => {
    expect(isUuid("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
    expect(isUuid("nie-uuid")).toBe(false);
  });
});
