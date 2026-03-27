import React, { useRef, useState, useEffect } from "react";
import { Coins } from "lucide-react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { useDailyHabits } from "../../hooks/useDailyHabits";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";
import { getAppDate } from "../../lib/dateUtils";
import { FormButtons } from "../CommonButtons";

interface DailySpendingFormProps {
  date?: string;
}

export default function DailySpendingForm({ date }: Readonly<DailySpendingFormProps>) {
  const today = getAppDate();
  const targetDate = date ?? today;
  const { habits, loading, updateSpending } = useDailyHabits(targetDate);
  const { toast } = useToast();
  const { user } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current && habits) {
      inputRef.current.value = habits.daily_spending?.toFixed(2) ?? "0";
    }
  }, [habits]);

  const handleSave = async () => {
    const value = Number.parseFloat(inputRef.current?.value || "0");
    await withRetry(
      () => updateSpending(value),
      toast,
      { context: "DailySpendingForm.updateSpending", userId: user?.id }
    );
    toast.success("Zmieniono pomyślnie.");
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (inputRef.current && habits) {
      inputRef.current.value = habits.daily_spending?.toFixed(2) ?? "0";
    }
    setIsEditing(false);
  };

  if (loading || !habits) return null;

  return (
    <div className="widget flex justify-between items-center px-4 py-3 gap-3">
      <div className="flex items-center text-text gap-4">
        <span className="text-yellow-500">
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
          <FormButtons onClickSave={handleSave} onClickClose={handleCancel} loading={loading} small/>
        </div>
      ) : (
        <div onClick={() => setIsEditing(true)}
          className="max-h-[24px] cursor-pointer text-sm sm:text-base font-bold text-text hover:text-primary transition-colors flex items-center gap-1.5 bg-surface border border-gray-200 dark:border-gray-700 px-3 py-1 rounded-lg shrink-0"
          title="Kliknij, aby edytować">
          {habits.daily_spending ? habits.daily_spending.toFixed(2) : "0.00"}
          <span className="text-[10px] sm:text-xs font-medium text-textMuted uppercase tracking-wider">PLN</span>
        </div>
      )}
    </div>
  );
}