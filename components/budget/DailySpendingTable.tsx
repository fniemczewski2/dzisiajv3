interface Props {
  currentMonth: number;
  daysInMonth: number;
  dailySpendingByDate: Record<number, number>;
  monthNames: string[];
}

export default function DailySpendingTable({
  currentMonth,
  daysInMonth,
  dailySpendingByDate,
  monthNames,
}: Props) {
  const sum = Object.values(dailySpendingByDate).reduce(
    (acc, val) => acc + val,
    0
  );

  return (
    <div className="bg-white p-2 rounded-xl shadow mb-8">
      <h3 className="font-bold mb-2">
        Wydatki dzienne ({monthNames[currentMonth - 1]})
      </h3>
      <table className="w-full table-auto border-collapse">
        <thead>
          <tr>
            <th className="border px-1.5 py-1">Dzień</th>
            <th className="border px-1.5 py-1">Kwota</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
            <tr key={day}>
              <td className="border px-1.5 py-1">{day}</td>
              <td className="border px-1.5 py-1">
                {(dailySpendingByDate[day] ?? 0).toFixed(2)}
              </td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="border px-1.5 py-1">Suma</td>
            <td className="border px-1.5 py-1">{sum.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
