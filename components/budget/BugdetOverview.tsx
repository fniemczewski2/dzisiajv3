"use client";

import React, { useState } from "react";
import type { CategorySpending, UncategorisedSummary } from "../../types";

interface Props {
  summary: CategorySpending[];
  uncategorised: UncategorisedSummary;
  totalIncome: number;
  loading: boolean;
}

type View = "year" | "month";

function ProgressBar({ value, max, danger }: { value: number; max: number; danger?: boolean }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const over = max > 0 && value > max;
  return (
    <div className="relative h-2 bg-surface rounded-full overflow-hidden border border-gray-100 dark:border-gray-800">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          over || danger
            ? "bg-red-500"
            : pct > 80
            ? "bg-amber-500"
            : "bg-primary"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function BudgetOverview({
  summary,
  uncategorised,
  totalIncome,
  loading,
}: Props) {
  const [view, setView] = useState<View>("year");

  const totalSpent = summary.reduce(
    (s, c) => s + (view === "year" ? c.spent : c.thisMonthSpent),
    0
  ) + (view === "year" ? uncategorised.spent : 0);

  const totalLimit = summary.reduce(
    (s, c) => s + (view === "year" ? c.limit : c.thisMonthLimit),
    0
  );

  if (loading) {
    return (
      <div className="card rounded-xl shadow-sm p-4 sm:p-6 mb-6 animate-pulse h-48" />
    );
  }

  return (
    <div className="card rounded-xl shadow-sm p-4 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-text">Budżet</h3>
        <div className="flex gap-1 bg-surface rounded-xl p-1">
          {(["year", "month"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                view === v
                  ? "bg-primary text-white shadow-sm"
                  : "text-textMuted hover:text-text"
              }`}
            >
              {v === "year" ? "Rok" : "Miesiąc"}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="font-medium text-textSecondary">
            Łącznie wydano
          </span>
          <span className="font-bold tabular-nums text-text">
            {totalSpent.toFixed(0)} / {totalLimit.toFixed(0)} zł
          </span>
        </div>
        <ProgressBar value={totalSpent} max={totalLimit} />
        {view === "year" && totalIncome > 0 && (
          <p className="text-xs text-textMuted mt-1.5 text-right">
            Przychody: {totalIncome.toFixed(0)} zł · Saldo: {(totalIncome - totalSpent).toFixed(0)} zł
          </p>
        )}
      </div>

      <div className="space-y-3">
        {summary.map(({ category, spent, limit, remaining, thisMonthSpent, thisMonthLimit, thisMonthRemaining }) => {
          const isYear  = view === "year";
          const s       = isYear ? spent          : thisMonthSpent;
          const l       = isYear ? limit          : thisMonthLimit;
          const r       = isYear ? remaining      : thisMonthRemaining;
          const over    = r < 0;

          return (
            <div key={category.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-text flex items-center gap-1.5">
                  {category.name}
                  {category.is_monthly && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                      mies.
                    </span>
                  )}
                </span>
                <span className={`font-bold tabular-nums ${over ? "text-red-500" : "text-textSecondary"}`}>
                  {s.toFixed(0)} / {l.toFixed(0)} zł
                  {over && (
                    <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-red-500">
                      +{Math.abs(r).toFixed(0)} zł
                    </span>
                  )}
                </span>
              </div>
              <ProgressBar value={s} max={l} danger={over} />
              {!over && (
                <p className="text-right text-[11px] text-textMuted mt-0.5">
                  Zostało: {r.toFixed(0)} zł
                </p>
              )}
            </div>
          );
        })}

        {uncategorised.spent > 0 && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-textMuted italic">Inne</span>
              <span className="font-bold tabular-nums text-textSecondary">
                {uncategorised.spent.toFixed(0)} zł
              </span>
            </div>
            <div className="h-2 bg-surface rounded-full border border-gray-100 dark:border-gray-800">
              <div className="h-full w-full rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>
          </div>
        )}

        {summary.length === 0 && uncategorised.spent === 0 && (
          <p className="text-sm text-textMuted text-center py-4">
            Brak danych. Dodaj kategorie budżetu i rachunki.
          </p>
        )}
      </div>
    </div>
  );
}