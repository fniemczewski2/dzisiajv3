"use client";
// Naprawione:
//   1. toast.error() bez useToast → dodano useToast
//   2. toast.error("Błąd...", error) — błędna sygnatura → toast.error(msg)
import React, { useState } from "react";
import { useSettings } from "../../hooks/useSettings";
import { useToast } from "../../providers/ToastProvider";
import { Bell, Sun, Clock, Calendar, Droplet, CheckSquare, Moon } from "lucide-react";
import LoadingState from "../LoadingState";

export default function NotificationPreferences() {
  const { settings, updateSettings, loading } = useSettings();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  if (loading) return <LoadingState />;
  if (!settings) return null;

  const handleToggle = async (key: string, currentValue: boolean) => {
    setIsUpdating(true);
    try {
      await updateSettings({ [key]: !currentValue });
    } catch {
      toast.error("Wystąpił błąd podczas aktualizacji powiadomień.");
    } finally {
      setIsUpdating(false);
    }
  };

  const notifOptions = [
    { key: "notif_morning_brief", label: "Poranny Brief",            description: "Zaplanuj dzień o 07:00",                              icon: Sun,         color: "text-amber-500"  },
    { key: "notif_tasks",         label: "Nadchodzące zadania",       description: "5 minut przed zadaniem na planie dnia",               icon: Clock,       color: "text-blue-500"   },
    { key: "notif_events",        label: "Wydarzenia z kalendarza",   description: "5 min, 1 dzień i 7 dni przed wydarzeniem",            icon: Calendar,    color: "text-purple-500" },
    { key: "notif_water",         label: "Nawodnienie",               description: "Powiadomienia o 10:00, 14:00 i 18:00",               icon: Droplet,     color: "text-cyan-500"   },
    { key: "notif_habits",        label: "Codzienne nawyki",          description: "Przypomnienie o nawykach",                           icon: CheckSquare, color: "text-green-500"  },
    { key: "notif_evening",       label: "Wieczorny audyt",           description: "Podsumowanie dnia o 21:00",                          icon: Moon,        color: "text-indigo-500" },
  ];

  return (
    <div className="space-y-2">
      {notifOptions.map(({ key, label, description, icon: Icon, color }) => {
        const isActive = settings[key as keyof typeof settings] !== false;
        return (
          <div key={key} className="flex items-center justify-between gap-4 p-3 rounded-xl transition-colors">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl bg-surface border border-gray-100 dark:border-gray-800 shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-text text-sm sm:text-base">{label}</p>
                <p className="text-xs sm:text-sm text-textMuted mt-0.5 leading-snug max-w-[250px] sm:max-w-full">{description}</p>
              </div>
            </div>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleToggle(key, isActive)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isActive ? "bg-primary" : "bg-gray-300 dark:bg-gray-700"
              } ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
              role="switch"
              aria-checked={isActive}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}