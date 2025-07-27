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
  rates: Record<number, number>;
  onRateChange: (month: number, value: number) => void;
}

export default function BudgetStatsTable({
  rows,
  isEditing,
  rates,
  onRateChange,
}: Props) {
  return (
    <div className="mb-4 bg-white rounded-xl shadow">
      <table className="w-full table rounded-xl text-sm">
        <thead className="bg-gray-100 text-gray-700 font-semibold">
          <tr>
            <th className="p-2 text-left">mc</th>
            <th className="p-2 text-right">suma</th>
            <th className="p-2 text-right">stawka</th>
            <th className="p-2 text-right">godz.</th>
          </tr>
        </thead>
        <tbody className="text-gray-700">
          {rows.map(({ month, monthName, sum, rate, hours }, i) => (
            <tr key={month} className={i % 2 === 0 ? "bg-gray-50" : ""}>
              <td className="px-2 py-1">{monthName}</td>
              <td className="text-right px-2 py-1">{sum.toFixed(2)}</td>
              <td className="text-right px-2 py-1">
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={rates[month]}
                    onChange={(e) =>
                      onRateChange(month, parseFloat(e.target.value) || 0)
                    }
                    className="w-16 p-1 rounded"
                  />
                ) : (
                  rate.toFixed(2)
                )}
              </td>
              <td className="text-right px-2 py-1">{hours}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

  );
}
