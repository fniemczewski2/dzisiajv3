// __tests__/lib/financeShortcut.test.ts

import { describe, it, expect } from "vitest";
import { parseAmount, parseFinanceShortcutPayload } from "@/lib/financeShortcut";

describe("parseAmount", () => {
  it.each([
    [12.5, 12.5],
    ["12,34 zł", 12.34],
    ["PLN 1 234,50", 1234.5],
    ["-7,99", 7.99],
    ["abc", null],
    ["1,234,5", null],
  ])("%s → %s", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });
});

describe("parseFinanceShortcutPayload", () => {
  it("przyjmuje kwotę i sprzedawcę, ignoruje inne pola", () => {
    expect(parseFinanceShortcutPayload({ amount: "19,99 zł", merchant: "  Księgarnia  X ", card: "1234" })).toEqual({
      ok: true,
      amount: 19.99,
      merchant: "Księgarnia X",
    });
  });

  it("odrzuca brak kwoty, kwotę zerową i pustego sprzedawcę", () => {
    expect(parseFinanceShortcutPayload({ merchant: "X" }).ok).toBe(false);
    expect(parseFinanceShortcutPayload({ amount: 0, merchant: "X" }).ok).toBe(false);
    expect(parseFinanceShortcutPayload({ amount: 5, merchant: " " }).ok).toBe(false);
    expect(parseFinanceShortcutPayload("nie json").ok).toBe(false);
  });

  it("przyjmuje treść jako tekst JSON (Skróty)", () => {
    expect(parseFinanceShortcutPayload('{"amount":"5,00","merchant":"Kawiarnia"}')).toEqual({
      ok: true,
      amount: 5,
      merchant: "Kawiarnia",
    });
  });
});
