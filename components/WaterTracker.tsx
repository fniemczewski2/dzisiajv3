// components/WaterTracker.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Droplet } from "lucide-react";

export default function WaterTracker() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const userEmail = session?.user?.email ?? "";

  // Dziś w formacie YYYY-MM-DD
  const today = new Date().toISOString().split("T")[0];

  // lokalny stan
  const [water, setWater] = useState(0);
  const [loading, setLoading] = useState(true);

  // fetch existing water record
  const fetchWater = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("water")
      .select("*")
      .eq("date", today)
      .eq("user_name", userEmail)
      .maybeSingle();

    if (!error && data) {
      setWater(parseFloat(data.amount));
    }
    setLoading(false);
  }, [supabase, today, userEmail]);

  useEffect(() => {
    if (userEmail) fetchWater();
  }, [userEmail, fetchWater]);

  // przy zmianie slidera zapisujemy do DB
  const handleChange = async (val: number) => {
    setWater(val);
    await supabase
      .from("water")
      .upsert(
        { date: today, user_name: userEmail, amount: val },
        { onConflict: "date,user_name" }
      );
  };

  const fillPercent = (water / 2) * 100;

  if (!session) {
    return <div className="py-6 text-center">Ładowanie…</div>;
  }

  return (
    <div className="bg-card rounded-xl shadow p-4 mb-4">
      {/* Nagłówek */}
      <div className="flex items-center mb-4">
        <Droplet className="w-6 h-6 mr-2" />
        <span className="font-medium text-gray-700">
          Spożycie wody:{" "}
          <span className="font-medium">{water.toFixed(1)}L</span> / 2.0L
        </span>
      </div>

      {/* Pasek + slider */}
      <div className="relative w-full h-3 bg-secondary/10 rounded">
        <div
          className="absolute left-0 top-0 h-3 rounded bg-primary transition-all duration-200"
          style={{ width: `${fillPercent}%` }}
        />
        <div
          className="absolute top-1/2 w-4 h-4 rounded-full bg-primary border-2 border-white transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
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
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}
