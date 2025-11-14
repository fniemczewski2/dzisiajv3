// components/budget/SummaryTable.tsx
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
    <>
      <h3 className="font-bold mb-2">Budżet roczny</h3>
      <div className="bg-white mb-4 rounded-xl shadow overflow-x-auto">
        <table className="w-full table-auto text-sm">
          <thead className="bg-gray-100 text-gray-700 font-semibold">
            <tr>
              <th className="px-2 py-2 text-left">mc</th>
              <th className="px-2 py-2 text-right">wpływy</th>
              <th className="px-2 py-2 text-right">dokonane</th>
              <th className="px-2 py-2 text-right">plany</th>
              <th className="px-2 py-2 text-right">zostało</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {Array.from({ length: 12 }, (_, i) => {
              const m = i + 1;
              const monthData = data[m];

              if (!loadedMonths.has(m)) {
                return (
                  <tr key={m} className={i % 2 === 0 ? "bg-gray-50" : ""}>
                    <td className="px-2 py-1">{monthNames[m - 1]}</td>
                    <td colSpan={4} className="text-center text-gray-400 px-2 py-1">
                      --
                    </td>
                  </tr>
                );
              }

              const income = monthData?.income ?? 0;
              const done = monthData?.doneExpense ?? 0;
              const planned = monthData?.plannedExpense ?? 0;
              const remaining = income - done - planned;

              return (
                <tr key={m} className={i % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="px-2 py-1">{monthNames[m - 1]}</td>
                  <td className="text-right px-2 py-1">{income.toFixed(2)}</td>
                  <td className="text-right px-2 py-1">{done.toFixed(2)}</td>
                  <td className="text-right px-2 py-1">{planned.toFixed(2)}</td>
                  <td className="text-right px-2 py-1 font-medium">
                    {remaining.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}