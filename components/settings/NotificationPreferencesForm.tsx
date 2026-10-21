// components/settings/NotificationPreferencesForm.tsx

import React, { useState } from "react";
import { useSettings } from "@/hooks/db/useSettings";
import {
  Sun,
  Clock,
  Calendar,
  Droplet,
  CheckSquare,
  Moon,
  Users,
  Gift,
  Coins,
  ListChecks,
  BellRing,
  Mail,
  CalendarCheck,
  Heart,
} from "lucide-react";

export default function NotificationPreferences() {
  const { settings, updateSettings } = useSettings();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!settings) return null;

  const handleToggle = async (key: string, currentValue: boolean) => {
    setIsUpdating(true);
    await updateSettings({ [key]: !currentValue });
    setIsUpdating(false);
  };

  const notifOptions = [
    { key: "notif_morning_brief", label: "Poranny Brief", description: "Zaplanuj dzień o 07:00", icon: Sun },
    {
      key: "notif_tasks",
      label: "Nadchodzące zadania",
      description: "5 minut przed zadaniem na planie dnia",
      icon: Clock,
    },
    {
      key: "notif_events",
      label: "Wydarzenia z kalendarza",
      description: "5 min, 1 dzień i 7 dni przed wydarzeniem",
      icon: Calendar,
    },
    { key: "notif_water", label: "Nawodnienie", description: "Powiadomienia o 10:00, 14:00 i 18:00", icon: Droplet },
    { key: "notif_habits", label: "Codzienne nawyki", description: "Przypomnienie o nawykach", icon: CheckSquare },
    { key: "notif_evening", label: "Wieczorny audyt", description: "Podsumowanie dnia o 21:00", icon: Moon },
    {
      key: "notif_birthdays",
      label: "Urodziny i imieniny",
      description: "W dniu oraz 1 i 7 dni wcześniej",
      icon: Gift,
    },
    {
      key: "notif_contact",
      label: "Przypomnienia o kontakcie",
      description: "Zgodnie z ustawionym priorytetem",
      icon: Users,
    },
    { key: "notif_bills", label: "Płatności rachunków", description: "W dniu oraz 1 i 7 dni wcześniej", icon: Coins },
    {
      key: "notif_day_schema",
      label: "Schemat dnia",
      description: "Dla wpisów schematu z włączonym powiadomieniem",
      icon: ListChecks,
    },
    {
      key: "notif_reminders",
      label: "Przypomnienia przy zadaniach",
      description: "O godzinach ustawionych ręcznie przy zadaniu",
      icon: BellRing,
    },
    {
      key: "notif_letters",
      label: "Terminy odpowiedzi na pisma",
      description: "Dzień przed terminem i w dniu terminu",
      icon: Mail,
    },
    {
      key: "notif_polls",
      label: "Ankiety terminów",
      description: "Dzień przed pierwszym proponowanym terminem",
      icon: CalendarCheck,
    },
    { key: "notif_love", label: "Serduszka", description: "Wiadomości od osób zaufanych", icon: Heart },
  ];

  return (
    <div className="space-y-2">
      {notifOptions.map(({ key, label, description, icon: Icon }) => {
        const isActive = settings[key as keyof typeof settings] !== false;
        return (
          <div key={key} className="flex items-center justify-between gap-4 rounded-xl p-3 transition-colors">
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-xl border border-line bg-surface p-2 text-text">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-text sm:text-base">{label}</p>
                <p className="mt-0.5 max-w-62.5 text-xs leading-snug text-text-muted sm:max-w-full sm:text-sm">
                  {description}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleToggle(key, isActive)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                isActive ? "bg-secondary" : "bg-line-strong"
              } ${isUpdating ? "cursor-not-allowed opacity-50" : ""}`}
              role="switch"
              aria-checked={isActive}
              aria-label={label}
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
