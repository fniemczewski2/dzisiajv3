// __tests__/lib/financeDedup.test.ts

import { describe, it, expect } from "vitest";
import { isSameTransaction, normalizeMerchant, sameMerchant, splitByDuplicates } from "@/lib/financeDedup";

const applePay = { date: "2026-11-20", amount: 24.99, is_income: false, description: "Żabka" };

describe("normalizeMerchant", () => {
  it("usuwa diakrytyki, cyfry i wielkość liter", () => {
    expect(normalizeMerchant("ŻABKA Z7231 K.1 POZNAŃ")).toBe("zabka z k poznan");
  });
});

describe("sameMerchant", () => {
  it("rozpoznaje ten sam sklep mimo numeru terminala i miasta", () => {
    expect(sameMerchant("Żabka", "PŁATNOŚĆ KARTĄ ŻABKA Z7231 POZNAN")).toBe(true);
  });

  it("nie łączy różnych sklepów", () => {
    expect(sameMerchant("Żabka", "BIEDRONKA 1234 POZNAN")).toBe(false);
  });
});

describe("isSameTransaction", () => {
  it("ta sama płatność zaksięgowana dwa dni później", () => {
    const bank = { date: "2026-11-22", amount: 24.99, is_income: false, description: "ZABKA Z7231 K.1 POZNAN" };
    expect(isSameTransaction(bank, applePay)).toBe(true);
  });

  it("inna kwota to inna płatność", () => {
    const bank = { date: "2026-11-20", amount: 25.99, is_income: false, description: "ZABKA Z7231" };
    expect(isSameTransaction(bank, applePay)).toBe(false);
  });

  it("wpływ nie łączy się z wydatkiem", () => {
    const bank = { date: "2026-11-20", amount: 24.99, is_income: true, description: "ZABKA ZWROT" };
    expect(isSameTransaction(bank, applePay)).toBe(false);
  });

  it("poza oknem dat to osobna płatność", () => {
    const bank = { date: "2026-11-30", amount: 24.99, is_income: false, description: "ZABKA Z7231" };
    expect(isSameTransaction(bank, applePay)).toBe(false);
  });
});

describe("splitByDuplicates", () => {
  it("jedna istniejąca transakcja zamyka tylko jeden wiersz z wyciągu", () => {
    const rows = [
      { date: "2026-11-21", amount: 24.99, is_income: false, description: "ZABKA Z7231 POZNAN" },
      { date: "2026-11-21", amount: 24.99, is_income: false, description: "ZABKA Z7231 POZNAN" },
    ];
    const out = splitByDuplicates(rows, [applePay]);
    expect(out.duplicates).toHaveLength(1);
    expect(out.fresh).toHaveLength(1);
  });

  it("bez odpowiedników wszystko jest nowe", () => {
    const rows = [{ date: "2026-11-21", amount: 10, is_income: false, description: "ORLEN" }];
    expect(splitByDuplicates(rows, [applePay]).fresh).toHaveLength(1);
  });
});
