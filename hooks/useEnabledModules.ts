// hooks/useEnabledModules.ts
//
// Wyłączone moduły z ustawień. Używane w wielu miejscach naraz (pasek, menu,
// wyszukiwarka, strażnik strony), więc kolumnę pobieramy raz na sesję
// (wspólny cache), a zmiany z Ustawień odbieramy ze zdarzenia „settingsUpdated”.

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/providers/AuthProvider";
import { isPathEnabled, normalizeDisabledModules } from "@/config/modules";

let cache: { userId: string; promise: Promise<string[]> } | null = null;
let latest: string[] = [];

function load(supabase: SupabaseClient, userId: string): Promise<string[]> {
  if (cache?.userId !== userId) {
    cache = {
      userId,
      promise: Promise.resolve(
        supabase.from("settings").select("disabled_modules").eq("user_id", userId).maybeSingle()
      ).then(({ data, error }) => (error ? [] : normalizeDisabledModules(data?.disabled_modules))),
    };
  }
  return cache.promise;
}

/** Tylko do testów. */
export function resetEnabledModulesCache(): void {
  cache = null;
  latest = [];
}

export function useEnabledModules() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [disabled, setDisabled] = useState<string[]>(latest);

  useEffect(() => {
    if (!userId || !supabase) return;
    let cancelled = false;
    void load(supabase, userId).then((list) => {
      latest = list;
      if (!cancelled) setDisabled(list);
    });
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<{ disabled_modules?: unknown }>).detail;
      if (!detail || !("disabled_modules" in detail)) return;
      const list = normalizeDisabledModules(detail.disabled_modules);
      latest = list;
      cache = { userId, promise: Promise.resolve(list) };
      setDisabled(list);
    };
    globalThis.addEventListener("settingsUpdated", onUpdate);
    return () => {
      cancelled = true;
      globalThis.removeEventListener("settingsUpdated", onUpdate);
    };
  }, [supabase, userId]);

  const isEnabled = useCallback((path: string) => isPathEnabled(path, disabled), [disabled]);
  return { disabled, isEnabled };
}
