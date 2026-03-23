"use client";

import React, { useState } from "react";

interface Props {
  summary: any[];
  uncategorised: any;
  totalIncome: number;
  loading: boolean;
}

type View = "year" | "month";

function ProgressBar({ spent, planned, max, danger }: { spent: number; planned: number; max: number; danger?: boolean }) {
  const total = spent + planned;
  const pctSpent = max > 0 ? Math.min((spent / max) * 100, 100) : 0;
  const pctPlanned = max > 0 ? Math.min((planned / max) * 100, 100 - pctSpent) : 0;
  
  const over = max > 0 && total > max;

  return (
    <div className="relative h-2 bg-surface rounded-full overflow-hidden border border-gray-100 dark:border-gray-800 flex">
      <div
        className={`h-full transition-all duration-500 ${
          over || danger
            ? "bg-red-500"
            : pctSpent > 80
            ? "bg-amber-500"
            : "bg-primary"
        }`}
        style={{ width: `${pctSpent}%` }}
      />
      {/* Pasek wydatków zaplanowanych (lekko przezroczysty i doklejony do głównego) */}
      <div
        className={`h-full transition-all duration-500 ${
          over || danger 
            ? "bg-red-400/60 dark:bg-red-500/50" 
            : "bg-blue-400/60 dark:bg-blue-500/50"
        }`}
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
}: Props) {
  const [view, setView] = useState<View>("year");
  const isYear = view === "year";

  const totalSpent = summary.reduce(
    (s, c) => s + (isYear ? c.spent : c.thisMonthSpent),
    0
  ) + (isYear ? (uncategorised.ySpent || 0) : (uncategorised.mSpent || 0));

  const totalPlanned = summary.reduce(
    (s, c) => s + (isYear ? c.planned : c.thisMonthPlanned),
    0
  ) + (isYear ? (uncategorised.yPlan || 0) : (uncategorised.mPlan || 0));

  const totalLimit = summary.reduce(
    (s, c) => s + (isYear ? c.limit : c.thisMonthLimit),
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
        <div className="flex justify-between items-end text-sm mb-1.5">
          <span className="font-medium text-textSecondary">
            Razem
          </span>
          <span className="font-bold tabular-nums text-text text-right">
            {totalSpent.toFixed(0)} 
            {totalPlanned > 0 && (
              <span className="text-textMuted font-normal text-xs ml-1">
                +{totalPlanned.toFixed(0)} 
              </span>
            )}
            {totalLimit > 0 && ` / ${totalLimit.toFixed(0)} zł`}
          </span>
        </div>
        <ProgressBar spent={totalSpent} planned={totalPlanned} max={totalLimit} />
        {isYear && totalIncome > 0 && (
          <p className="text-xs text-textMuted mt-1.5 text-right">
            Przychody: {totalIncome.toFixed(0)} zł · Saldo: {(totalIncome - totalSpent - totalPlanned).toFixed(0)} zł
          </p>
        )}
      </div>

      <div className="space-y-3">
        {summary.map((item) => {
          const s       = isYear ? item.spent : item.thisMonthSpent;
          const p       = isYear ? item.planned : item.thisMonthPlanned;
          const l       = isYear ? item.limit : item.thisMonthLimit;
          const r       = isYear ? item.remaining : item.thisMonthRemaining;

          const over    = l > 0 && (s + p) > l;

          return (
            <div key={item.category.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-text flex items-center gap-1.5">
                  {item.category.name}
                  {item.category.is_monthly && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                      mies.
                    </span>
                  )}
                </span>
                <span className={`font-bold tabular-nums ${over ? "text-red-500" : "text-textSecondary"}`}>
                  {s.toFixed(0)} 
                  {p > 0 && <span className="text-[11px] font-normal opacity-70 ml-0.5">+{p.toFixed(0)}</span>} 
                  {l > 0 && ` / ${l.toFixed(0)}`} zł
                  
                </span>
              </div>
              <ProgressBar spent={s} planned={p} max={l} danger={over} />
              {(!over && l > 0) && (
                <p className="text-right text-[10px] text-textMuted mt-0.5">
                  Zostało: {r.toFixed(0)} zł
                </p>
              )}
             {over && (
                <p className="text-right text-[10px] text-red-500 mt-0.5">
                 +{Math.abs(r).toFixed(0)} zł
                </p>
              )}
            </div>
          );
        })}

        {/* Obsługa transakcji nieskategoryzowanych (Inne) */}
        {((isYear ? uncategorised.ySpent : uncategorised.mSpent) > 0 || (isYear ? uncategorised.yPlan : uncategorised.mPlan) > 0) && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-textMuted italic">Inne</span>
              <span className="font-bold tabular-nums text-textSecondary">
                {(isYear ? uncategorised.ySpent : uncategorised.mSpent).toFixed(0)} zł
                {(isYear ? uncategorised.yPlan : uncategorised.mPlan) > 0 && (
                  <span className="text-[11px] font-normal opacity-70 ml-0.5">
                    +{(isYear ? uncategorised.yPlan : uncategorised.mPlan).toFixed(0)}
                  </span>
                )}
              </span>
            </div>
            <div className="h-2 bg-surface rounded-full border border-gray-100 dark:border-gray-800">
              <div className="h-full w-full rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>
          </div>
        )}

        {summary.length === 0 && !uncategorised?.ySpent && !uncategorised?.yPlan && (
          <p className="text-sm text-textMuted text-center py-4">
            Brak danych. Dodaj kategorie budżetu i rachunki.
          </p>
        )}
      </div>
    </div>
  );
}