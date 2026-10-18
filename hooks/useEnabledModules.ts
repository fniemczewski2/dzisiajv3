// hooks/useEnabledModules.ts
//
// Wyłączone moduły z ustawień użytkownika (SettingsProvider). Używane naraz
// przez pasek, menu, wyszukiwarkę i strażnika strony – wszystkie czytają ten
// sam stan, więc nie ma osobnych zapytań ani pamięci podręcznej.

import { useCallback } from "react";
import { useSettings } from "@/hooks/db/useSettings";
import { isPathEnabled } from "@/config/modules";

const NONE: readonly string[] = Object.freeze([]);

export function useEnabledModules() {
  const disabled = useSettings().settings.disabled_modules ?? NONE;
  const isEnabled = useCallback((path: string) => isPathEnabled(path, disabled), [disabled]);
  return { disabled, isEnabled };
}
