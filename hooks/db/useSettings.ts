// hooks/db/useSettings.ts
//
// Dostęp do ustawień użytkownika z SettingsProvider (providers/SettingsProvider.tsx).
// Wszystkie komponenty dzielą jeden stan i jedno zapytanie do bazy.

import { useContext } from "react";
import { SettingsContext, type SettingsContextValue } from "@/providers/SettingsProvider";

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings musi być użyty wewnątrz <SettingsProvider>.");
  return context;
}
