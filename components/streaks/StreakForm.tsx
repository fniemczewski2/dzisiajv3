"use client";

import React, { useState, SyntheticEvent } from "react";
import {
  Flame, Trophy, Target, Heart, Cigarette, Beer,
  UtensilsCrossed, Dumbbell, PiggyBank, BriefcaseMedical,
} from "lucide-react";
import { useStreaks } from "../../hooks/useStreaks";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";
import { getAppDate } from "../../lib/dateUtils";
import LoadingState from "../LoadingState";
import { AddButton, CancelButton, FormButtons } from "../CommonButtons";

interface StreakFormProps {
  onChange: () => void;
  onCancel?: () => void;
}

const ICONS = [
  { name: "flame",     icon: Flame },
  { name: "trophy",    icon: Trophy },
  { name: "target",    icon: Target },
  { name: "heart",     icon: Heart },
  { name: "cigarette", icon: Cigarette },
  { name: "beer",      icon: Beer },
  { name: "utensils",  icon: UtensilsCrossed },
  { name: "dumbbell",  icon: Dumbbell },
  { name: "piggybank", icon: PiggyBank },
  { name: "medical",   icon: BriefcaseMedical },
];

export default function StreakForm({ onChange, onCancel }: StreakFormProps) {
  const { addStreak } = useStreaks();
  const { toast } = useToast();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(getAppDate());
  const [icon, setIcon] = useState("flame");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Podaj nazwę nawyku!");
      return;
    }
    setLoading(true);
    await withRetry(
      () => addStreak({ name: name.trim(), start_date: startDate, icon }),
      toast,
      { context: "StreakForm.addStreak", userId: user?.id }
    );

    toast.success("Dodano pomyślnie.");
    setName("");
    setStartDate(getAppDate());
    setIcon("flame");
    setLoading(false);
    onChange();
    onCancel?.();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="form-card"
    >
      <div className="space-y-4">
        <div>
          <label className="form-label" htmlFor="streak-name">Nazwa nawyku:</label>
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
          <label className="form-label" htmlFor="start-date">Data rozpoczęcia:</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="input-field w-full min-w-0 px-1 text-xs"
            required
          />
        </div>
        <div>
          <label className="form-label mb-2">Ikona:</label>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {ICONS.map(({ name: iName, icon: IconComponent }) => (
              <button
                key={iName}
                type="button"
                onClick={() => setIcon(iName)}
                title={`Wybierz ikonę: ${iName}`}
                className={`p-1.5 sm:p-2.5 rounded-xl transition-all flex flex-col items-center justify-center ${
                  icon === iName
                    ? "bg-surfaceHover text-text shadow-sm scale-110"
                    : "bg-transparent text-textMuted hover:bg-surface hover:text-text"
                }`}
              >
                <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            ))}
          </div>
        </div>
        <FormButtons onClickClose={onCancel} loading={loading}/>
      </div>
    </form>
  );
}
