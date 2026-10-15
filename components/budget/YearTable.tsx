// components/budget/YearTable.tsx
//
// Rok w liczbach: wpływy, wydatki i bilans w każdym miesiącu, z transakcji.
// (Zastępuje dawną tabelę ze stawką godzinową.)

import React, { useMemo } from "react";
import { useTransactions } from "@/hooks/db/useFinance";
import { formatPln, round2 } from "@/lib/finance";

const MONTHS = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];

export default function YearTable({ year }: Readonly<{ year: number }>) {
  const { transactions, loading } = useTransactions({ from: `${year}-01-01`, to: `${year}-12-31` });

  const rows = useMemo(() => {
    const months = MONTHS.map((name) => ({ name, income: 0, expenses: 0 }));
    for (const t of transactions) {
      const m = Number(t.date.slice(5, 7)) - 1;
      if (t.is_income) months[m].income += t.amount;
      else months[m].expenses += t.amount;
    }
    return months.map((m) => ({ ...m, income: round2(m.income), expenses: round2(m.expenses), balance: round2(m.income - m.expenses) }));
  }, [transactions]);

  const total = rows.reduce((s, r) => ({ income: s.income + r.income, expenses: s.expenses + r.expenses }), { income: 0, expenses: 0 });

  if (loading) return null;

  return (
    <section className="card max-w-2xl rounded-card p-4 sm:p-5" aria-labelledby="year-table-h">
      <h2 id="year-table-h" className="mb-3 font-bold text-text">Rok {year} w liczbach</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-right text-text-secondary">
              <th scope="col" className="py-2 text-left font-medium">Miesiąc</th>
              <th scope="col" className="py-2 font-medium">Wpływy</th>
              <th scope="col" className="py-2 font-medium">Wydatki</th>
              <th scope="col" className="py-2 font-medium">Bilans</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-line text-right tabular-nums last:border-0">
                <th scope="row" className="py-1.5 text-left font-normal capitalize text-text">{r.name}</th>
                <td className="py-1.5">{r.income ? formatPln(r.income) : "—"}</td>
                <td className="py-1.5">{r.expenses ? formatPln(r.expenses) : "—"}</td>
                <td className={`py-1.5 ${r.balance < 0 ? "text-red-700 dark:text-red-300" : ""}`}>{r.income || r.expenses ? formatPln(r.balance) : "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="text-right font-semibold tabular-nums">
              <th scope="row" className="pt-2 text-left">Razem</th>
              <td className="pt-2">{formatPln(round2(total.income))}</td>
              <td className="pt-2">{formatPln(round2(total.expenses))}</td>
              <td className="pt-2">{formatPln(round2(total.income - total.expenses))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
