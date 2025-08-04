"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Droplet, Loader2 } from "lucide-react";

interface WaterTrackerProps {
  date?: string; 
}

export default function WaterTracker({ date }: WaterTrackerProps) {
  const session = useSession();
  const supabase = useSupabaseClient();
  const userEmail = session?.user?.email ?? "";

  const today = new Date().toISOString().split("T")[0];
  const targetDate = date ?? today; // ← domyślnie today

  const [water, setWater] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchWater = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("water")
      .select("*")
      .eq("date", targetDate)
      .eq("user_name", userEmail)
      .maybeSingle();

    if (!error && data) {
      setWater(parseFloat(data.amount));
    }
    setLoading(false);
  }, [supabase, targetDate, userEmail]);

  useEffect(() => {
    if (userEmail) fetchWater();
  }, [userEmail, fetchWater]);

  const handleChange = async (val: number) => {
    setWater(val);
    await supabase
      .from("water")
      .upsert(
        { date: targetDate, user_name: userEmail, amount: val },
        { onConflict: "date,user_name" }
      );
  };

  const fillPercent = (water / 2) * 100;

  if (!session) {
    return <Loader2 className="animate-spin w-6 h-6 text-gray-500" />;
  }

  return (
    <div className="bg-card rounded-xl flex flex-row shadow items-center justify-around px-3 py-2 sm:p-4 mb-2 h-[40px] sm:h-[56px]">
      <Droplet className="w-5 h-5 sm:w-6 sm:h-6" />
      <div className="relative w-[58%] sm:w-[75%] h-3 mx-2 bg-secondary/10 rounded">
        <div
          className="absolute left-0 top-0 h-3 rounded-full bg-primary transition-all duration-200"
          style={{ width: `${fillPercent}%` }}
        />
        <div
          className="absolute top-1/2 w-6 h-6 rounded-full bg-primary border-2 border-white transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
          style={{ left: `${fillPercent}%` }}
        />
        <input
          title="water"
          type="range"
          min="0"
          max="2.0"
          step="0.1"
          value={water}
          disabled={loading}
          onChange={(e) => handleChange(parseFloat(e.target.value))}
          className="absolute inset-0 rounded-full w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <span className="font-medium text-gray-700 ml-2">
        {water.toFixed(1)}L / 2.0L
      </span>
    </div>
  );
}
