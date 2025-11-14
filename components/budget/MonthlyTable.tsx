// components/budget/MonthlyTable.tsx
import React from "react";

interface MonthData {
  budget: number;
  monthlySpending: number;
}

interface Props {
  data: Record<number, MonthData>;
  monthNames: string[];
  loadedMonths: Set<number>;
}

export default function MonthlyBudgetTable({
  data,
  monthNames,
  loadedMonths,
}: Props) {
  return (
    <div className="bg-white mb-4 rounded-xl shadow overflow-x-auto">
      <table className="w-full table-auto text-sm">
        <thead className="bg-gray-100 text-gray-700 font-semibold">
          <tr>
            <th className="px-2 py-2 text-left">mc</th>
            <th className="px-2 py-2 text-right">bieżące</th>
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
                  <td colSpan={2} className="text-center text-gray-400 px-2 py-1">
                    --
                  </td>
                </tr>
              );
            }

            const budget = monthData?.budget ?? 0;
            const spent = monthData?.monthlySpending ?? 0;
            const remaining = budget - spent;

            return (
              <tr key={m} className={i % 2 === 0 ? "bg-gray-50" : ""}>
                <td className="px-2 py-1">{monthNames[m - 1]}</td>
                <td className="text-right px-2 py-1">{budget.toFixed(2)}</td>
                <td className="text-right px-2 py-1">{remaining.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}