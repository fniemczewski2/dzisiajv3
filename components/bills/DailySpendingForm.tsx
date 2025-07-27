import React, { useRef, useState, useEffect } from "react";
import { useDailySpending } from "../../hooks/useDailySpending";
import { Loader2, Save, X } from "lucide-react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

interface DailySpendingFormProps {
  userEmail: string;
}

export const DailySpendingForm: React.FC<DailySpendingFormProps> = ({
  userEmail,
}) => {
  const today = new Date().toISOString().split("T")[0];
  const { dailySpending, loading, fetchDailySpending } = useDailySpending(
    userEmail,
    today
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
      .update({ daily_spending: value })
      .eq("date", today)
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
    <span className="py-1 flex items-center">
      <h3 className="mr-1.5">Wydane dzisiaj:&nbsp;</h3>
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
        <span
          onClick={() => setIsEditing(true)}
          className="cursor-pointer font-bold hover:underline"
          title="Kliknij, aby edytować"
        >
          {dailySpending ? dailySpending.toFixed(2) : "0.00"} PLN
        </span>
      )}
    </span>
  );
};
