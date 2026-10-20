// components/budget/BudgetOverview.tsx

import React, { useState } from "react";
import type { SummaryItem } from "@/types/bills";

interface BudgetOverviewProps {
  summary: SummaryItem[];
  uncategorised: {
    ySpent: number;
    yPlan: number;
    mSpent: number;
    mPlan: number;
  };
  totalIncome: number;
  loading: boolean;
  selectedMonth?: number;
}

interface ProgressBarProps {
  spent: number;
  planned: number;
  max: number;
  danger?: boolean;
}

type View = "year" | "month";

const getStatusColor = (isOver: boolean, isDanger: boolean, percentage: number) => {
  if (isOver || isDanger) return "bg-danger-solid";
  if (percentage > 80) return "bg-warning-solid";
  return "bg-secondary";
};

function ProgressBar({ spent, planned, max, danger = false }: Readonly<ProgressBarProps>) {
  const total = spent + planned;
  const pctSpent = max > 0 ? Math.min((spent / max) * 100, 100) : 0;
  const pctPlanned = max > 0 ? Math.min((planned / max) * 100, 100 - pctSpent) : 0;
  const over = max > 0 && total > max;
  const barColor = getStatusColor(over, danger, pctSpent);

  return (
    <div className="relative flex h-2 overflow-hidden rounded-full border border-line bg-surface">
      <div className={`h-full transition-all duration-500 ${barColor}`} style={{ width: `${pctSpent}%` }} />
      <div
        className={`h-full transition-all duration-500 ${over || danger ? "bg-danger-line/60" : "bg-info-line/60"}`}
        style={{ width: `${pctPlanned}%` }}
      />
    </div>
  );
}

export default function BudgetOverview({
  summary,
  uncategorised,
  totalIncome,
  loading,
}: Readonly<BudgetOverviewProps>) {
  const [view, setView] = useState<View>("month");
  const isYear = view === "year";

  const totalSpent =
    summary.reduce((s, c) => s + (isYear ? c.spent : c.thisMonthSpent), 0) +
    (isYear ? uncategorised?.ySpent || 0 : uncategorised?.mSpent || 0);

  const totalPlanned =
    summary.reduce((s, c) => s + (isYear ? c.planned : c.thisMonthPlanned), 0) +
    (isYear ? uncategorised?.yPlan || 0 : uncategorised?.mPlan || 0);

  const totalLimit = summary.reduce((s, c) => s + (isYear ? c.limit : c.thisMonthLimit), 0);

  if (loading) {
    return null;
  }

  return (
    <div className="card mb-6 p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold text-text">Budżet</h3>
        <div className="flex gap-1 rounded-xl bg-surface p-1">
          {(["year", "month"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                view === v ? "bg-secondary text-white shadow-sm" : "text-text-muted hover:text-text"
              }`}
            >
              {v === "year" ? "Rok" : "Miesiąc"}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <div className="mb-1.5 flex items-end justify-between text-sm">
          <span className="font-medium text-text-secondary">Razem</span>
          <span className="text-right font-bold text-text tabular-nums">
            {totalSpent.toFixed(0)}
            {totalPlanned > 0 && (
              <span className="ml-1 text-xs font-normal text-text-muted">+{totalPlanned.toFixed(0)}</span>
            )}
            {totalLimit > 0 && ` / ${totalLimit.toFixed(0)} zł`}
          </span>
        </div>
        <ProgressBar spent={totalSpent} planned={totalPlanned} max={totalLimit} />
        {isYear && totalIncome > 0 && (
          <p className="mt-1.5 text-right text-xs text-text-muted">
            Przychody: {totalIncome.toFixed(0)} zł • Saldo: {(totalIncome - totalSpent - totalPlanned).toFixed(0)} zł
          </p>
        )}
        {!isYear && (
          <p className="mt-1.5 text-right text-xs text-text-muted">
            Wyświetlane są dane i limity dla wybranego miesiąca
          </p>
        )}
      </div>

      <div className="space-y-3">
        {summary.map((item) => {
          const s = isYear ? item.spent : item.thisMonthSpent;
          const p = isYear ? item.planned : item.thisMonthPlanned;

          const l = isYear ? item.limit : item.thisMonthLimit;
          const r = isYear ? item.remaining : item.thisMonthRemaining;

          const over = l > 0 && s + p > l;

          return (
            <div key={item.category.id}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium text-text">
                  {item.category.name}
                  {item.category.is_monthly && (
                    <span
                      className="rounded-lg bg-info-soft px-1.5 py-0.5 text-xs font-bold text-primary"
                      title="Kategoria limitowana co miesiąc"
                    >
                      mies.
                    </span>
                  )}
                </span>
                <span className={`font-bold tabular-nums ${over ? "text-danger" : "text-text-secondary"}`}>
                  {s.toFixed(0)}
                  {p > 0 && <span className="ml-0.5 text-xs font-normal opacity-70">+{p.toFixed(0)}</span>}
                  {l > 0 && ` / ${l.toFixed(0)}`} zł
                </span>
              </div>
              <ProgressBar spent={s} planned={p} max={l} danger={over} />

              {!over && l > 0 && (
                <p className="mt-0.5 text-right text-xs text-text-muted">Zostało: {r.toFixed(0)} zł</p>
              )}
              {over && <p className="mt-0.5 text-right text-xs text-danger">+{Math.abs(r).toFixed(0)} zł</p>}
            </div>
          );
        })}

        {((isYear ? uncategorised?.ySpent : uncategorised?.mSpent) > 0 ||
          (isYear ? uncategorised?.yPlan : uncategorised?.mPlan) > 0) && (
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium text-text-muted italic">Inne</span>
              <span className="font-bold text-text-secondary tabular-nums">
                {(isYear ? uncategorised.ySpent : uncategorised.mSpent).toFixed(0)} zł
                {(isYear ? uncategorised.yPlan : uncategorised.mPlan) > 0 && (
                  <span className="ml-0.5 text-xs font-normal opacity-70">
                    +{(isYear ? uncategorised.yPlan : uncategorised.mPlan).toFixed(0)}
                  </span>
                )}
              </span>
            </div>
            <div className="h-2 rounded-full border border-line bg-surface">
              <div className="h-full w-full rounded-full bg-line-strong" />
            </div>
          </div>
        )}

        {summary.length === 0 && !uncategorised?.ySpent && !uncategorised?.yPlan && (
          <p className="py-4 text-center text-sm text-text-muted">Brak danych. Dodaj kategorie budżetu i rachunki.</p>
        )}
      </div>
    </div>
  );
}
