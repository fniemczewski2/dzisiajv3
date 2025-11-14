// components/bills/DailySpendingForm.tsx
import React, { useRef, useState, useEffect } from "react";
import { Coins, Loader2, Save, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { useDailyHabits } from "../../hooks/useDailyHabits";
import { getAppDate } from "../../lib/dateUtils";

interface DailySpendingFormProps {
  userEmail: string;
  date?: string;
}

export const DailySpendingForm: React.FC<DailySpendingFormProps> = ({
  userEmail,
  date,
}) => {
  const today = getAppDate();

  const targetDate = date ?? today;
  const { habits, loading, updateSpending } = useDailyHabits(targetDate);

  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current && habits) {
      inputRef.current.value = habits.daily_spending?.toFixed(2) ?? "0";
    }
  }, [habits]);

  const handleSave = async () => {
    const value = parseFloat(inputRef.current?.value || "0");
    await updateSpending(value);
    setIsEditing(false);
  };

  if (loading || !habits) {
    return (
      <div className="bg-card rounded-xl shadow sm:py-4 sm:my-4 max-w-sm min-w-[300px] flex justify-center items-center px-3 py-2 sm:p-4 mb-2 h-[40px] sm:h-[56px]">
        <Loader2 className="animate-spin w-5 h-5" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow sm:py-4 sm:my-4 max-w-sm min-w-[300px] flex justify-between items-center px-3 py-2 sm:p-4 mb-2 h-[40px] sm:h-[56px]">
      <h3 className="mr-1.5 flex">
        <Coins className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
        Wydane{" "}
        {targetDate === today
          ? "dzisiaj"
          : `(${format(parseISO(targetDate), "d.MM", { locale: pl })})`}
        :
      </h3>
      {isEditing ? (
        <div className="flex items-center">
          <input
            ref={inputRef}
            type="number"
            step="0.01"
            className="w-16 p-1 border rounded"
            title="Daily Spending"
          />
          <button
            onClick={handleSave}
            className="ml-2 p-2 bg-green-100 rounded-lg hover:bg-green-200"
            title="Zapisz"
            type="submit"
          >
            <Save className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="ml-2 p-2 bg-red-100 rounded-lg hover:bg-red-200"
            title="Anuluj"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className="cursor-pointer font-bold hover:underline"
          title="Kliknij, aby edytować"
        >
          {habits.daily_spending ? habits.daily_spending.toFixed(2) : 0} PLN
        </div>
      )}
    </div>
  );
};