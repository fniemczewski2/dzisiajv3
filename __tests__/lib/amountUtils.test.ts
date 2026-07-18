import { describe, it, expect } from "vitest";
import { isValidAmountInput, parseAmountInput } from "@/lib/amountUtils";

describe("isValidAmountInput", () => {
  it("accepts plain digits", () => {
    expect(isValidAmountInput("36")).toBe(true);
  });

  it("accepts a comma as the decimal separator (Polish convention)", () => {
    expect(isValidAmountInput("36,75")).toBe(true);
  });

  it("accepts a dot as the decimal separator", () => {
    expect(isValidAmountInput("36.75")).toBe(true);
  });

  it("accepts a trailing separator while the user is still typing", () => {
    expect(isValidAmountInput("36,")).toBe(true);
    expect(isValidAmountInput("36.")).toBe(true);
  });

  it("accepts an empty string (field cleared while retyping)", () => {
    expect(isValidAmountInput("")).toBe(true);
  });

  it("rejects a second decimal separator", () => {
    expect(isValidAmountInput("36,7,5")).toBe(false);
    expect(isValidAmountInput("36.7.5")).toBe(false);
    expect(isValidAmountInput("36,7.5")).toBe(false);
  });

  it("rejects letters and other non-numeric characters", () => {
    expect(isValidAmountInput("36zł")).toBe(false);
    expect(isValidAmountInput("abc")).toBe(false);
  });
});

describe("parseAmountInput", () => {
  it("parses a comma-separated amount without truncating the cents (regression)", () => {
    // Number.parseFloat("36,75") na samej kropce/przecinku zwraca 36 bez normalizacji -
    // to właśnie po cichu gubiło grosze przy zapisie.
    expect(parseAmountInput("36,75")).toBe(36.75);
  });

  it("parses a dot-separated amount", () => {
    expect(parseAmountInput("36.75")).toBe(36.75);
  });

  it("parses a whole number with no separator", () => {
    expect(parseAmountInput("100")).toBe(100);
  });

  it("falls back to 0 for an empty or invalid string instead of NaN", () => {
    expect(parseAmountInput("")).toBe(0);
    expect(parseAmountInput(",")).toBe(0);
  });

  it("parses a trailing separator as the whole-number part typed so far", () => {
    expect(parseAmountInput("36,")).toBe(36);
  });
});
