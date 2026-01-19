// components/streaks/StreakForm.tsx
"use client";

import React, { useState, FormEvent } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { 
  Flame, 
  Trophy, 
  Target, 
  Heart, 
  Cigarette,
  Beer,
  UtensilsCrossed,
  Dumbbell,
  PiggyBank,
  BriefcaseMedical
} from "lucide-react";
import { Streak } from "../../types";
import LoadingState from "../LoadingState";
import { getAppDate } from "../../lib/dateUtils";
import { AddButton, CancelButton } from "../CommonButtons";

interface StreakFormProps {
  onChange: () => void;
  onCancel?: () => void;
  initial?: Streak;
}

const ICONS = [
  { name: "flame", icon: Flame },
  { name: "trophy", icon: Trophy },
  { name: "target", icon: Target},
  { name: "heart", icon: Heart },
  { name: "cigarette", icon: Cigarette },
  { name: "beer", icon: Beer },
  { name: "utensils", icon: UtensilsCrossed},
  { name: "dumbbell", icon: Dumbbell },
  { name: "piggybank", icon: PiggyBank },
  { name: "medical", icon: BriefcaseMedical }, 
];

export default function StreakForm({
  onChange,
  onCancel,
}: StreakFormProps) {
  const supabase = useSupabaseClient();
  const session = useSession();
  const userEmail = session?.user?.email || process.env.NEXT_PUBLIC_USER_EMAIL;

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(getAppDate());
  const [icon, setIcon] = useState("flame");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert("Podaj nazwę celu!");
      return;
    }

    setLoading(true);

    const payload = {
      user_email: userEmail,
      name: name.trim(),
      start_date: startDate,
      icon,
    };

    try {
      await supabase.from("streaks").insert(payload);
      onChange();
      setName("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setIcon("flame");
      if (onCancel) onCancel();
    }
    catch (error) {
      console.error("Błąd podczas zapisywania:", error);
      alert("Wystąpił błąd podczas zapisywania");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-card p-6 rounded-xl shadow-lg max-w-2xl mx-auto"
    >
      <div>
        <label className="block text-sm font-medium mb-2" htmlFor="streak-name">
          Nazwa:
        </label>
        <input
          id="streak-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="np. Nie piję alkoholu"
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2" htmlFor="start-date">
          Data rozpoczęcia:
        </label>
        <input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          max={new Date().toISOString().split("T")[0]}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Ikona:</label>
        <div className="grid grid-cols-10 gap-2">
          {ICONS.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => setIcon(item.name)}
                className={`p-2 rounded-full border-none transition-all flex flex-col items-center gap-2 ${
                  icon === item.name
                    ? "border-primary bg-blue-50 ring-2 ring-primary"
                    : "border-gray-200 hover:border-gray-400"
                }`}
              >
                <IconComponent className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex space-x-2 items-center mt-2">
        <AddButton loading={loading} />
        {onCancel && <CancelButton onCancel={onCancel} loading={loading} />}
        {loading && <LoadingState />}
      </div>
    </form>
  );
}