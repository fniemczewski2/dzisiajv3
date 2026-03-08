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
    <div className="bg-card border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm mb-4 flex justify-between items-center px-4 py-3 gap-3 transition-colors">
      
      {/* Sekcja nagłówka i ikony */}
      <div className="flex items-center text-text">
        <span className="text-yellow-500 mr-3">
          <Coins className="w-5 h-5" />
        </span>
        <h3 className="font-medium text-sm sm:text-base">
          Wydatki
          {!isEditing && (
            <span className="text-textMuted text-xs sm:text-sm ml-2 font-normal">
              {targetDate === today ? "dzisiaj" : `(${format(parseISO(targetDate), "d.MM", { locale: pl })})`}
            </span>
          )}
        </h3>
      </div>

      {/* Sekcja edycji lub podglądu kwoty */}
      {isEditing ? (
        <div className="flex items-center gap-1.5 sm:gap-2 max-h-[24px]">
          <input
            ref={inputRef}
            type="number"
            step="0.01"
            className="input-field h-[30px] w-20 sm:w-24 text-right tabular-nums text-text py-1 px-2 font-medium"
            title="Szybki wydatek"
            autoFocus
          />
          
          <button
            onClick={handleSave}
            className="flex items-center justify-center h-[30px] min-w-[30px] bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
            title="Zapisz"
            type="button"
          >
            <Save className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center justify-center h-[30px] min-w-[30px] bg-surface text-textSecondary hover:text-text hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
            title="Anuluj"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className="max-h-[24px] cursor-pointer text-sm sm:text-base font-bold text-text hover:text-primary transition-colors flex items-center gap-1.5 bg-surface border border-gray-200 dark:border-gray-700 px-3 py-1 rounded-lg shrink-0"
          title="Kliknij, aby edytować"
        >
          {habits.daily_spending ? habits.daily_spending.toFixed(2) : "0.00"} 
          <span className="text-[10px] sm:text-xs font-medium text-textMuted uppercase tracking-wider">PLN</span>
        </div>
      )}
    </div>
  );
}