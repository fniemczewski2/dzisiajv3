"use client";

import React, { useState, SyntheticEvent } from "react";
import { 
  Flame, Trophy, Target, Heart, Cigarette, Beer,
  UtensilsCrossed, Dumbbell, PiggyBank, BriefcaseMedical
} from "lucide-react";
import { Streak } from "../../types";
import LoadingState from "../LoadingState";
import { getAppDate } from "../../lib/dateUtils";
import { AddButton, CancelButton } from "../CommonButtons";
import { useAuth } from "../../providers/AuthProvider";

interface StreakFormProps {
  onChange: () => void;
  onCancel?: () => void;
  initial?: Streak;
}

const ICONS = [
  { name: "flame", icon: Flame }, { name: "trophy", icon: Trophy },
  { name: "target", icon: Target}, { name: "heart", icon: Heart },
  { name: "cigarette", icon: Cigarette }, { name: "beer", icon: Beer },
  { name: "utensils", icon: UtensilsCrossed}, { name: "dumbbell", icon: Dumbbell },
  { name: "piggybank", icon: PiggyBank }, { name: "medical", icon: BriefcaseMedical }, 
];

export default function StreakForm({
  onChange,
  onCancel,
}: StreakFormProps) {

  const { user, supabase } = useAuth();
  const userId = user?.id;

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(getAppDate());
  const [icon, setIcon] = useState("flame");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert("Podaj nazwę nawyku!");
      return;
    }

    setLoading(true);

    const payload = {
      user_id: userId,
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
      className="bg-card border border-gray-200 dark:border-gray-800 p-5 sm:p-6 rounded-2xl shadow-sm mb-8 animate-in fade-in slide-in-from-top-4"
    >
      <h3 className="text-xl font-bold text-text mb-6">Dodaj nowy nawyk</h3>
      
      <div className="space-y-5">
        <div>
          <label className="form-label" htmlFor="streak-name">
            Nazwa nawyku:
          </label>
          <input
            id="streak-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="np. 0 dni bez słodyczy, Biegam rano"
            className="input-field font-medium"
            required
          />
        </div>
        
        <div>
          <label className="form-label" htmlFor="start-date">
            Data rozpoczęcia:
          </label>
          <input
            id="start-date"
            type="date w-full min-w-0 px-1 text-sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="input-field"
            required
          />
        </div>
        
        <div>
          <label className="form-label mb-2">Ikona:</label>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 bg-surface p-3 rounded-xl border border-gray-100 dark:border-gray-800">
            {ICONS.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setIcon(item.name)}
                  title={`Wybierz ikonę: ${item.name}`}
                  className={`p-2.5 rounded-xl transition-all flex flex-col items-center justify-center ${
                    icon === item.name
                      ? "bg-primary text-white shadow-sm scale-110"
                      : "bg-transparent text-textSecondary hover:bg-card hover:text-text"
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex space-x-3 items-center pt-4 border-t border-gray-100 dark:border-gray-800">
          <AddButton loading={loading} />
          {onCancel && <CancelButton onCancel={onCancel} loading={loading} />}
          {loading && <LoadingState />}
        </div>
      </div>
    </form>
  );
}