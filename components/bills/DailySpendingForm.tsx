import React, { useRef, useState, useEffect } from "react";
import { useDailySpending } from "../../hooks/useDailySpending";
import { Coins, Loader2, Save, X } from "lucide-react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";

interface DailySpendingFormProps {
  userEmail: string;
  date?: string; 
}

export const DailySpendingForm: React.FC<DailySpendingFormProps> = ({
  userEmail,
  date,
}) => {
  const today = new Date().toISOString().split("T")[0];
  const targetDate = date ?? today; 

  const { dailySpending, loading, fetchDailySpending } = useDailySpending(
    userEmail,
    targetDate
  );

  const supabase = useSupabaseClient();
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = dailySpending?.toFixed(2) ?? "0";
    }
  }, [dailySpending]);

  const handleSave = async () => {
    const value = parseFloat(inputRef.current?.value || "0");
    const { error: updateError } = await supabase
      .from("daily_habits")
      .upsert({ daily_spending: value })
      .eq("date", targetDate)
      .eq("user_name", userEmail);
    if (!updateError) {
      fetchDailySpending();
    }

    setIsEditing(false);
  };

  if (loading) {
    return <Loader2 className="animate-spin w-5 h-5" />;
  }

  return (
    <div className="bg-card rounded-xl shadow sm:py-4 sm:my-4 max-w-sm min-w-[300px] flex justify-between items-center px-3 py-2 sm:p-4 mb-2 h-[40px] sm:h-[56px]">
        <h3 className="mr-1.5 flex">
          <Coins className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
          Wydane {targetDate === today ? "dzisiaj" : `(${format(parseISO(targetDate), "d.MM", { locale: pl })})`}:
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
              {loading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <Save className="w-5 h-5" />
              )}
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
            {dailySpending ? dailySpending.toFixed(2) : "0.00"} PLN
          </div>
        )}
    </div>
  );
};
