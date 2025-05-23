// components/DailySpendingCell.tsx
import React, { useState, useEffect } from "react";
import { useDailySpending } from "../hooks/useDailySpending";
import { Loader2, Save, X } from "lucide-react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

interface DailySpendingFormProps {
  userEmail: string;
}

export const DailySpendingForm: React.FC<DailySpendingFormProps> = ({
  userEmail,
}) => {
  const today = new Date().toISOString().split("T")[0];
  const { dailySpending, loading, error, fetchDailySpending } =
    useDailySpending(userEmail, today);

  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState<number>(0);
  const supabase = useSupabaseClient();

  // sync local input when the fetched value changes
  useEffect(() => {
    setInputValue(dailySpending);
  }, [dailySpending]);

  const handleSave = async () => {
    const { error: updateError } = await supabase
      .from("daily_activities")
      .upsert(
        { user_name: userEmail, date: today, daily_spending: inputValue },
        { onConflict: "user_name,date" }
      );

    if (updateError) {
      console.error("Error updating daily spending:", updateError.message);
    } else {
      fetchDailySpending();
    }
    setIsEditing(false);
  };

  if (loading) {
    return <Loader2 className="animate-spin w-5 h-5" />;
  }

  return (
    <span className="py-1 flex items-center">
      <h3 className="mr-1.5">Wydane dzisiaj:</h3>
      {isEditing ? (
        <div className="flex items-center">
          <input
            type="number"
            step="0.01"
            value={inputValue}
            onChange={(e) => setInputValue(parseFloat(e.target.value))}
            className="w-16 p-1 border rounded"
            title="Daily Spending"
          />
          <button
            onClick={handleSave}
            className="ml-2 p-2 bg-green-100 rounded-lg hover:bg-green-200"
            title="Zapisz"
          >
            {loading ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <Save className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
            }}
            className="ml-2 p-2 bg-red-100 rounded-lg hover:bg-red-200"
            title="Anuluj"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className="cursor-pointer font-bold hover:underline"
          title="Click to edit"
        >
          {dailySpending.toFixed(2)}
          {" PLN"}
        </span>
      )}
    </span>
  );
};
