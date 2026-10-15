// __tests__/lib/finance.test.ts

import { describe, it, expect } from "vitest";
import {
  billOccurrences,
  billMonthStatus,
  forecastMonth,
  merchantKey,
  suggestBillLink,
  suggestCategoryName,
  dailySpending,
  summarizeMonth,
  importKey,
  nextBillDue,
} from "@/lib/finance";
import type { RecurringBill, Transaction } from "@/types/finance";
import type { BudgetCategory } from "@/types/bills";

const bill = (over: Partial<RecurringBill>): RecurringBill => ({
  id: "b1", user_id: "u", profile_id: null, name: "Apple Music", amount: 19.99, category_id: "c-sub",
  start_date: "2026-01-15", recurrence: { freq: "monthly", interval: 1, monthlyBy: "monthday" }, active: true, ...over,
});
const tx = (over: Partial<Transaction>): Transaction => ({
  id: "t", user_id: "u", profile_id: null, date: "2026-01-15", amount: 19.9, is_income: false, description: "Apple",
  category_id: null, recurring_bill_id: null, link_status: null, source: "csv", import_key: null, ...over,
});
const cat = (id: string, name: string) => ({ id, name } as BudgetCategory);

describe("terminy i prognoza", () => {
  it("co miesiąc 31. dnia → ostatni dzień krótszego miesiąca", () => {
    const b = bill({ start_date: "2026-01-31" });
    expect(billOccurrences(b, "2026-02-01", "2026-04-30")).toEqual(["2026-02-28", "2026-03-31", "2026-04-30"]);
  });
  it("jednorazowy i nieaktywny", () => {
    expect(billOccurrences(bill({ recurrence: null, start_date: "2026-03-10" }), "2026-03-01", "2026-03-31")).toEqual(["2026-03-10"]);
    expect(billOccurrences(bill({ active: false }), "2026-01-01", "2026-12-31")).toEqual([]);
  });
  it("prognoza kolejnego miesiąca sumuje wszystkie terminy", () => {
    const f = forecastMonth([bill({}), bill({ id: "b2", name: "Czynsz", amount: 1500, start_date: "2026-01-10" })], "2026-02");
    expect(f.total).toBe(1519.99);
    expect(f.items.map((i) => i.bill.id)).toEqual(["b2", "b1"]);
  });
  it("najbliższy termin", () => {
    expect(nextBillDue(bill({}), "2026-02-16")).toBe("2026-03-15");
  });
});

describe("status rachunku w miesiącu", () => {
  it("zapłacony, gdy jest powiązana transakcja (także sugestia)", () => {
    const s = billMonthStatus(bill({}), "2026-02", [tx({ date: "2026-02-14", recurring_bill_id: "b1", link_status: "suggested" })], "2026-02-20");
    expect(s.status).toBe("paid");
  });
  it("zaległy po terminie, oczekuje przed", () => {
    expect(billMonthStatus(bill({}), "2026-02", [], "2026-02-20").status).toBe("overdue");
    expect(billMonthStatus(bill({}), "2026-02", [], "2026-02-10").status).toBe("pending");
  });
});

describe("D1: łączenie z rachunkami", () => {
  it("klucz sprzedawcy", () => {
    expect(merchantKey("APPLE.COM/BILL")).toBe("APPLE");
    expect(merchantKey("Płatność kartą ORLEN 1234")).toBe("ORLEN");
    expect(merchantKey("Apple Music")).toBe("APPLE");
  });
  it("uczy się z ręcznego połączenia (styczeń → luty)", () => {
    const history = [tx({ id: "jan", date: "2026-01-15", recurring_bill_id: "b1", link_status: "manual" })];
    expect(suggestBillLink(tx({ date: "2026-02-15" }), [bill({})], history)).toEqual({ billId: "b1", reason: "learned" });
  });
  it("bez historii: po nazwie, kwocie i terminie ±7 dni", () => {
    expect(suggestBillLink(tx({ date: "2026-03-17" }), [bill({})], [])).toEqual({ billId: "b1", reason: "name" });
    expect(suggestBillLink(tx({ date: "2026-03-29" }), [bill({})], [])).toBeNull(); // daleko od terminu
    expect(suggestBillLink(tx({ amount: 99 }), [bill({})], [])).toBeNull(); // inna kwota
    expect(suggestBillLink(tx({ is_income: true }), [bill({})], [])).toBeNull();
  });
  it("sugestie nie uczą się z innych sugestii", () => {
    const history = [tx({ recurring_bill_id: "b1", link_status: "suggested", description: "Spotify" })];
    expect(suggestBillLink(tx({ description: "Spotify" }), [bill({})], history)).toBeNull();
  });
});

describe("D2, wydatki dnia, podsumowanie", () => {
  const cats = [cat("c-food", "Jedzenie"), cat("c-gastro", "Gastronomia"), cat("c-sub", "Subskrypcje")];
  const names = new Map(cats.map((c) => [c.id, c.name]));

  it("kategoria z ostatniej transakcji tego sprzedawcy", () => {
    const history = [tx({ description: "BIEDRONKA 123", category_id: "c-food", date: "2026-01-02" })];
    expect(suggestCategoryName(tx({ description: "Biedronka Poznań" }), history, names)).toBe("Jedzenie");
  });

  it("wydatki dnia z wybranych kategorii (bez przychodów i innych dni)", () => {
    const list = [
      tx({ date: "2026-02-01", amount: 30, category_id: "c-food" }),
      tx({ date: "2026-02-01", amount: 25.5, category_id: "c-gastro" }),
      tx({ date: "2026-02-01", amount: 19.9, category_id: "c-sub" }),
      tx({ date: "2026-02-02", amount: 10, category_id: "c-food" }),
      tx({ date: "2026-02-01", amount: 500, is_income: true, category_id: "c-food" }),
    ];
    expect(dailySpending(list, "2026-02-01", ["jedzenie", "Gastronomia"], cats)).toBe(55.5);
  });

  it("podsumowanie miesiąca", () => {
    const s = summarizeMonth(
      [tx({ amount: 19.9, category_id: "c-sub", recurring_bill_id: "b1" }), tx({ amount: 30, category_id: "c-food" }), tx({ amount: 5000, is_income: true })],
      cats
    );
    expect(s).toMatchObject({ income: 5000, expenses: 49.9, balance: 4950.1, billsPaid: 19.9 });
    expect(s.byCategory.map((r) => r.name)).toEqual(["Jedzenie", "Subskrypcje"]);
  });

  it("klucz importu rozróżnia identyczne transakcje z tego samego dnia", () => {
    const t = { date: "2026-02-01", amount: 5, is_income: false, description: "Kawa" };
    expect(importKey(t, 0)).not.toBe(importKey(t, 1));
  });
});
