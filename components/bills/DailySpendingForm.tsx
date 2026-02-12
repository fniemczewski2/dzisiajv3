// components/bills/DailySpendingForm.tsx
import React, { useRef, useState, useEffect } from "react";
import { Coins, Save, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { useDailyHabits } from "../../hooks/useDailyHabits";
import { getAppDate } from "../../lib/dateUtils";
import LoadingState from "../LoadingState";

interface DailySpendingFormProps {
  date?: string;
}

export default function DailySpendingForm({ date }: DailySpendingFormProps) {
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

  const handleCancel = () => {
    if (inputRef.current && habits) {
      inputRef.current.value = habits.daily_spending?.toFixed(2) ?? "0";
    }
    setIsEditing(false);
  };

  if (loading || !habits) {
    return <LoadingState />;
  }

  return (
    <div className="bg-card rounded-xl shadow overflow-hiddenbg-card sm:my-4 flex justify-between items-center px-3 py-2 sm:p-4 transition">
      <h3 className="mr-1.5 flex font-semibold items-center">
        <Coins className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
        Wydano{" "}
        {targetDate === today
          ? "dzisiaj"
          : `(${format(parseISO(targetDate), "d.MM", { locale: pl })})`}
        
      </h3>
      {isEditing ? (
        <div className="flex items-center max-h-[24px]">
          <input
            ref={inputRef}
            type="number"
            step="0.01"
            className="w-16 p-1 border rounded"
            title="Daily Spending"
            autoFocus
          />
          <button
            onClick={handleSave}
            className="ml-2 p-1.5 bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
            title="Zapisz"
            type="button"
          >
            <Save className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancel}
            className="ml-2 p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            title="Anuluj"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className="cursor-pointer font-bold hover:underline"
          title="Kliknij, aby edytować"
        >
          {habits.daily_spending ? habits.daily_spending.toFixed(2) : "0.00"} PLN
        </div>
      )}
    </div>
  );
}