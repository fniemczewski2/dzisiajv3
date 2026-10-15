// __tests__/components/TransactionsSection.test.tsx

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }) }));

import TransactionsSection from "@/components/finance/TransactionsSection";
import { plannedBillRows } from "@/hooks/db/useBudgetSummary";
import type { RecurringBill, Transaction } from "@/types/finance";
import type { BudgetCategory } from "@/types/bills";

const bill: RecurringBill = {
  id: "b1", user_id: "u", profile_id: null, name: "Apple Music", amount: 19.99, category_id: "c1",
  start_date: "2026-01-15", recurrence: { freq: "monthly", interval: 1 }, active: true,
};
const tx: Transaction = {
  id: "t1", user_id: "u", profile_id: null, date: "2026-02-15", amount: 19.9, is_income: false, description: "Apple",
  category_id: "c1", recurring_bill_id: "b1", link_status: "suggested", source: "csv", import_key: null,
};
const cats = [{ id: "c1", name: "Subskrypcje" } as BudgetCategory];

describe("TransactionsSection", () => {
  it("sugestia jest oznaczona i da się ją zatwierdzić albo odrzucić", () => {
    const onLink = vi.fn();
    render(
      <TransactionsSection
        monthLabel="luty 2026" monthFrom="2026-02-01" transactions={[tx]} categories={cats}
        categoryNames={new Map([["c1", "Subskrypcje"]])} bills={[bill]} profiles={[]} profileId={null}
        onAdd={vi.fn()} onUpdate={vi.fn()} onLink={onLink} onRemove={vi.fn()}
        csv={{ loadHistory: vi.fn(), withSuggestions: vi.fn(), importTransactions: vi.fn() }}
      />
    );
    expect(screen.getByText(/Sugestia automatyczna: Apple Music/)).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/do sprawdzenia: 1/);
    fireEvent.click(screen.getByRole("button", { name: /Zatwierdź powiązanie Apple z Apple Music/ }));
    expect(onLink).toHaveBeenLastCalledWith("t1", "b1");
    fireEvent.click(screen.getByRole("button", { name: /Odrzuć sugestię dla Apple/ }));
    expect(onLink).toHaveBeenLastCalledWith("t1", null);
    // podsumowanie: wydatki i „w tym rachunki stałe”
    expect(screen.getAllByText(/19,90/).length).toBeGreaterThan(0);
  });
});

describe("plannedBillRows (budżet)", () => {
  it("planuje przyszłe terminy, pomija miesiące z płatnością", () => {
    const rows = plannedBillRows([bill], [{ date: "2026-11-03", recurring_bill_id: "b1" }], "2026-01-01", "2026-12-31", "2026-10-20");
    expect(rows.map((r) => r.date)).toEqual(["2026-12-15"]); // 15.11 opłacony 3.11, 15.10 już minął
  });
});
