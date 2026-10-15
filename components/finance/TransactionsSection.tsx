// components/finance/TransactionsSection.tsx

import React, { useEffect, useId, useMemo, useState } from "react";
import { Check, Plus, Sparkles, Trash2, Wallet, X } from "lucide-react";
import { formatPln, summarizeMonth } from "@/lib/finance";
import TransactionForm from "./TransactionForm";
import CsvImport from "./CsvImport";
import type { BudgetCategory } from "@/types/bills";
import type { FinanceProfile, NewTransaction, RecurringBill, Transaction } from "@/types/finance";

interface Props {
  monthLabel: string;
  monthFrom: string;
  transactions: readonly Transaction[];
  categories: readonly BudgetCategory[];
  categoryNames: ReadonlyMap<string, string>;
  bills: readonly RecurringBill[];
  profiles: readonly FinanceProfile[];
  profileId: string | null;
  onAdd: (tx: NewTransaction) => Promise<unknown>;
  onUpdate: (id: string, patch: Partial<Transaction>) => void;
  onLink: (id: string, billId: string | null) => void;
  onRemove: (id: string) => void;
  csv: Omit<React.ComponentProps<typeof CsvImport>, "categories" | "categoryNames" | "bills" | "profileId">;
  /** Zmiana wartości otwiera formularz (szybka akcja „Dodaj wydatek”). */
  addSignal?: number;
}

const dayFmt = (d: string) => d.split("-").reverse().slice(0, 2).join(".");

export default function TransactionsSection(props: Readonly<Props>) {
  const { monthLabel, monthFrom, transactions, categories, categoryNames, bills, profiles, profileId, onAdd, onUpdate, onLink, onRemove, csv, addSignal = 0 } = props;
  const id = useId();
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    if (addSignal > 0) setAdding(true);
  }, [addSignal]);
  const summary = useMemo(() => summarizeMonth(transactions, categories), [transactions, categories]);
  const billName = useMemo(() => new Map(bills.map((b) => [b.id, b.name])), [bills]);
  const suggestions = transactions.filter((t) => t.link_status === "suggested");

  return (
    <section aria-labelledby={`${id}-h`} className="card rounded-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${id}-h`} className="flex items-center gap-2 text-lg font-bold text-text">
          <Wallet className="h-5 w-5 text-primary" aria-hidden="true" />
          Wydatki i wpływy <span className="text-sm font-normal text-text-secondary">– {monthLabel}</span>
        </h2>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong px-3 text-sm font-medium text-text hover:bg-surface"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Dodaj
        </button>
      </div>

      {adding && (
        <div className="mb-4">
          <TransactionForm
            categories={categories}
            bills={bills}
            profiles={profiles}
            defaultProfileId={profileId}
            defaultDate={undefined}
            onSave={onAdd}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {/* Podsumowanie miesiąca */}
      <dl className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Wpływy", summary.income, "text-green-800 dark:text-green-300"],
          ["Wydatki", summary.expenses, "text-text"],
          ["Bilans", summary.balance, summary.balance < 0 ? "text-red-700 dark:text-red-300" : "text-text"],
          ["w tym rachunki stałe", summary.billsPaid, "text-text-secondary"],
        ].map(([label, value, cls]) => (
          <div key={label as string} className="rounded-lg border border-line p-3">
            <dt className="text-xs text-text-secondary">{label as string}</dt>
            <dd className={`text-lg font-semibold tabular-nums ${cls as string}`}>{formatPln(value as number)}</dd>
          </div>
        ))}
      </dl>

      {summary.byCategory.length > 0 && (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="mb-1 text-left text-sm font-semibold text-text">Wydatki wg kategorii</caption>
            <thead className="sr-only">
              <tr><th scope="col">Kategoria</th><th scope="col">Liczba</th><th scope="col">Kwota</th><th scope="col">Udział</th></tr>
            </thead>
            <tbody>
              {summary.byCategory.map((row) => {
                const share = summary.expenses > 0 ? row.expenses / summary.expenses : 0;
                return (
                  <tr key={row.categoryId ?? "none"} className="border-b border-line last:border-0">
                    <th scope="row" className="py-1.5 pr-3 text-left font-normal text-text">{row.name}</th>
                    <td className="py-1.5 pr-3 text-right text-text-secondary tabular-nums">{row.count}×</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{formatPln(row.expenses)}</td>
                    <td className="w-1/3 py-1.5">
                      <div className="h-2 rounded-full bg-surface" aria-hidden="true">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round(share * 100)}%` }} />
                      </div>
                      <span className="sr-only">{Math.round(share * 100)}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mb-3">
        <CsvImport {...csv} categories={categories} categoryNames={categoryNames} bills={bills} profileId={profileId} />
      </div>

      {suggestions.length > 0 && (
        <p role="status" className="mb-3 flex items-center gap-2 rounded-lg bg-(--warning-bg) px-3 py-2 text-sm text-(--warning-fg)">
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
          Sugestie powiązań z rachunkami do sprawdzenia: {suggestions.length}. Zatwierdź albo odrzuć je przy transakcjach.
        </p>
      )}

      {transactions.length === 0 ? (
        <p className="text-sm text-text-secondary">Brak transakcji w tym miesiącu.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-176 text-sm">
            <caption className="sr-only">Transakcje od {monthFrom}</caption>
            <thead>
              <tr className="border-b border-line text-left text-text-secondary">
                <th scope="col" className="py-2 pr-2 font-medium">Data</th>
                <th scope="col" className="py-2 pr-2 font-medium">Opis</th>
                <th scope="col" className="py-2 pr-2 text-right font-medium">Kwota</th>
                <th scope="col" className="py-2 pr-2 font-medium">Kategoria</th>
                <th scope="col" className="py-2 pr-2 font-medium">Rachunek stały</th>
                <th scope="col" className="py-2"><span className="sr-only">Akcje</span></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-line align-top last:border-0">
                  <td className="py-2 pr-2 tabular-nums text-text-secondary">{dayFmt(t.date)}</td>
                  <td className="max-w-56 py-2 pr-2 wrap-break-words text-text">{t.description || "—"}</td>
                  <td className={`py-2 pr-2 text-right font-medium tabular-nums ${t.is_income ? "text-green-800 dark:text-green-300" : "text-text"}`}>
                    {t.is_income ? "+" : "−"}{formatPln(t.amount)}
                  </td>
                  <td className="py-2 pr-2">
                    <label htmlFor={`${id}-cat-${t.id}`} className="sr-only">Kategoria: {t.description}</label>
                    <select
                      id={`${id}-cat-${t.id}`}
                      value={t.category_id ?? ""}
                      onChange={(e) => onUpdate(t.id, { category_id: e.target.value || null })}
                      className="input-field min-w-36 py-1"
                    >
                      <option value="">Bez kategorii</option>
                      {t.category_id && !categories.some((c) => c.id === t.category_id) && (
                        <option value={t.category_id}>{categoryNames.get(t.category_id) ?? "Inna kategoria"}</option>
                      )}
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    {t.is_income ? (
                      <span className="text-text-secondary">—</span>
                    ) : (
                      <div className="space-y-1">
                        <label htmlFor={`${id}-bill-${t.id}`} className="sr-only">Rachunek stały: {t.description}</label>
                        <select
                          id={`${id}-bill-${t.id}`}
                          value={t.recurring_bill_id ?? ""}
                          onChange={(e) => onLink(t.id, e.target.value || null)}
                          className={`input-field min-w-36 py-1 ${t.link_status === "suggested" ? "border-dashed" : ""}`}
                        >
                          <option value="">Brak</option>
                          {bills.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        {t.link_status === "suggested" && t.recurring_bill_id && (
                          <div className="flex flex-wrap items-center gap-1 text-xs text-(--warning-fg)">
                            <Sparkles className="h-3 w-3" aria-hidden="true" />
                            <span>Sugestia automatyczna: {billName.get(t.recurring_bill_id)}</span>
                            <button
                              type="button"
                              onClick={() => onLink(t.id, t.recurring_bill_id)}
                              aria-label={`Zatwierdź powiązanie ${t.description} z ${billName.get(t.recurring_bill_id)}`}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-green-800 hover:bg-surface dark:text-green-300"
                            >
                              <Check className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onLink(t.id, null)}
                              aria-label={`Odrzuć sugestię dla ${t.description}`}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-surface"
                            >
                              <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onRemove(t.id)}
                      aria-label={`Usuń transakcję ${t.description}`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-surface hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
