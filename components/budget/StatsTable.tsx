import React from "react";

interface Props {
  rows: {
    month: number;
    monthName: string;
    sum: number;
    rate: number;
    hours: number;
  }[];
  isEditing: boolean;
  onRateChange: (month: number, value: number) => void;
}

export default function BudgetStatsTable({
  rows,
  isEditing,
  onRateChange,
}: Props) {
  return (
    <div className="w-full max-w-lg mb-4">
      <div className="card rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full table-auto text-xs sm:text-sm">
          <thead className="bg-surface text-textSecondary font-semibold border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-1.5 py-2 text-left">mc</th>
              <th className="px-1.5 py-2 text-right">suma</th>
              <th className="px-1.5 py-2 text-right">stawka</th>
              <th className="px-1.5 py-2 text-right">godz.</th>
            </tr>
          </thead>
          <tbody className="text-text divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map(({ month, monthName, sum, rate, hours }, i) => (
              <tr key={month} className={i % 2 === 0 ? "bg-card" : "bg-surface"}>
                <td className="px-1.5 py-1.5 font-medium text-textSecondary">{monthName}</td>
                <td className="text-right px-1.5 py-1.5 tabular-nums">{sum.toFixed(2)}</td>
                <td className="text-right px-1.5 py-1.5">
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={rate}
                      onChange={(e) =>
                        onRateChange(month, parseFloat(e.target.value) || 0)
                      }
                      className="input-field w-14 sm:w-20 text-right py-0.5 px-1 text-xs sm:text-sm tabular-nums"
                    />
                  ) : (
                    <span className="tabular-nums">{rate.toFixed(2)}</span>
                  )}
                </td>
                <td className="text-right px-1.5 py-1.5 font-semibold tabular-nums">{hours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}