// components/streaks/StreakForm.tsx
"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { 
  PlusCircleIcon, 
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

interface StreakFormProps {
  userEmail: string;
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

const COLORS = [
  { name: "zinc", label: "Biały", class: "bg-zinc-100" },
  { name: "yellow", label: "Żółty", class: "bg-yellow-200" },
  { name: "green", label: "Zielony", class: "bg-green-200" },
  { name: "cyan", label: "Niebieski", class: "bg-blue-200" },
  { name: "red", label: "Czerwony", class: "bg-red-200" },
];

export default function StreakForm({
  userEmail,
  onChange,
  onCancel,
  initial,
}: StreakFormProps) {
  const supabase = useSupabaseClient();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name || "");
  const [startDate, setStartDate] = useState(
    initial?.start_date || new Date().toISOString().split("T")[0]
  );
  const [icon, setIcon] = useState(initial?.icon || "flame");
  const [color, setColor] = useState(initial?.color || "blue");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setStartDate(initial.start_date);
      setIcon(initial.icon || "flame");
      setColor(initial.color || "blue");
    } else {
      setName("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setIcon("flame");
      setColor("blue");
    }
  }, [initial]);

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
      color,
    };

    try {
      await supabase.from("streaks").insert(payload);
      onChange();
      setName("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setIcon("flame");
      setColor("blue");
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

      {/* Wybór koloru */}
      <div>
        <label className="block text-sm font-medium mb-2">Kolor:</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => setColor(item.name)}
              className={`w-8 h-8 rounded-full transition-all ${item.class} ${
                color === item.name
                  ? "border-primary ring-2 ring-primary"
                  : "border-white hover:border-gray-300"
              }`}
              title={item.label}
            />
          ))}
        </div>
      </div>

      <div className="flex space-x-2 items-center mt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1 bg-primary hover:bg-secondary text-white rounded-lg flex flex-nowrap items-center transition disabled:opacity-50 disabled:cursor-not-allowed"
        >

              Dodaj&nbsp;&nbsp;<PlusCircleIcon className="w-5 h-5" />
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 bg-gray-300 rounded-lg hover:bg-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anuluj
          </button>
        )}
      </div>

      {loading && <LoadingState />}
    </form>
  );
}
