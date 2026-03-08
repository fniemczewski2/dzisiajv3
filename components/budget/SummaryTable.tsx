import React from "react";

interface MonthData {
  income: number;
  doneExpense: number;
  plannedExpense: number;
}

interface Props {
  data: Record<number, MonthData>;
  monthNames: string[];
  loadedMonths: Set<number>;
}

export default function SummaryTable({ data, monthNames, loadedMonths }: Props) {
  return (
    <div className="w-full">
      <h3 className="font-bold mb-2 text-text">Budżet roczny</h3>
      <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-x-auto mb-4">
        <table className="w-full table-auto text-xs sm:text-sm">
          <thead className="bg-surface text-textSecondary font-semibold border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-1 sm:px-2 py-2 text-left">mc</th>
              <th className="px-1 sm:px-2 py-2 text-right">wpływy</th>
              <th className="px-1 sm:px-2 py-2 text-right">dokonane</th>
              <th className="px-1 sm:px-2 py-2 text-right">plany</th>
              <th className="px-1 sm:px-2 py-2 text-right">zostało</th>
            </tr>
          </thead>
          <tbody className="text-text divide-y divide-gray-100 dark:divide-gray-800">
            {Array.from({ length: 12 }, (_, i) => {
              const m = i + 1;
              const monthData = data[m];
              const rowClass = i % 2 === 0 ? "bg-card" : "bg-surface/60";

              if (!loadedMonths.has(m)) {
                return (
                  <tr key={m} className={rowClass}>
                    <td className="px-1 sm:px-2 py-1.5 font-medium text-textSecondary">{monthNames[m - 1]}</td>
                    <td colSpan={4} className="text-center text-textSubtle px-1 py-1.5">
                      --
                    </td>
                  </tr>
                );
              }

              const income = monthData?.income ?? 0;
              const done = monthData?.doneExpense ?? 0;
              const planned = monthData?.plannedExpense ?? 0;
              const remaining = income - done - planned;

              const remainingClass = remaining < 0 ? "text-red-500 font-bold" : "text-text font-bold";

              return (
                <tr key={m} className={rowClass}>
                  <td className="px-1 sm:px-2 py-1.5 font-medium text-textSecondary">{monthNames[m - 1]}</td>
                  <td className="text-right px-1 sm:px-2 py-1.5 text-green-600 dark:text-green-500 font-medium tabular-nums">{income.toFixed(2)}</td>
                  <td className="text-right px-1 sm:px-2 py-1.5 tabular-nums">{done.toFixed(2)}</td>
                  <td className="text-right px-1 sm:px-2 py-1.5 tabular-nums">{planned.toFixed(2)}</td>
                  <td className={`text-right px-1 sm:px-2 py-1.5 tabular-nums ${remainingClass}`}>
                    {remaining.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}