interface Props {
  budgets: Record<number, number>;
  monthlySpending: Record<number, number>;
  monthNames: string[];
}

export default function MonthlyBudgetTable({
  budgets,
  monthlySpending,
  monthNames,
}: Props) {
  return (
    <div className="bg-white mb-4 rounded-xl shadow">
      <table className="w-full table-auto text-sm">
        <thead className="bg-gray-100 text-gray-700 font-semibold">
          <tr>
            <th className="px-2 py-2 text-left">mc</th>
            <th className="px-2 py-2 text-right">bieżące</th>
            <th className="px-2 py-2 text-right">zostało</th>
          </tr>
        </thead>
        <tbody className="text-gray-700">
          {Object.entries(budgets).map(([mStr, budget], i) => {
            const m = +mStr;
            const spent = monthlySpending[m] || 0;
            const rem = budget - spent;
            return (
              <tr key={m} className={i % 2 === 0 ? "bg-gray-50" : ""}>
                <td className="px-2 py-1">{monthNames[m - 1]}</td>
                <td className="text-right px-2 py-1">{budget.toFixed(2)}</td>
                <td className="text-right px-2 py-1">{rem.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
