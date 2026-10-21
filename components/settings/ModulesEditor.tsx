// components/settings/ModulesEditor.tsx
//
// Włączanie i wyłączanie modułów. Wyłączony moduł znika z menu i wyszukiwarki;
// jego dane zostają w bazie i wracają po ponownym włączeniu.

import React from "react";
import { TOGGLEABLE_MODULES } from "@/config/modules";
import { ToggleSwitch } from "@/components/ui/CommonButtons";

interface Props {
  disabled: string[];
  onChange: (next: string[]) => void;
}

export default function ModulesEditor({ disabled, onChange }: Readonly<Props>) {
  const enabledCount = TOGGLEABLE_MODULES.length - disabled.length;

  const toggle = (path: string, on: boolean) => onChange(on ? disabled.filter((p) => p !== path) : [...disabled, path]);

  return (
    <fieldset className="min-w-0 rounded-xl border border-line p-4" aria-labelledby="modules-heading">
      <legend id="modules-heading" className="text-sm font-semibold text-text">
        Moduły&nbsp;{enabledCount}/{TOGGLEABLE_MODULES.length} 
      </legend>
      <p className="mb-3 text-sm text-text-secondary">
        Dzisiaj, Zadania, Kalendarz i Ustawienia są zawsze dostępne.
      </p>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <fieldset>
            {TOGGLEABLE_MODULES.map((m) => {
              const id = `module-${m.path.replaceAll("/", "-")}`;
              return (
                <div key={m.path} className="flex min-h-11 items-center justify-between gap-3">
                  <label htmlFor={id} className="cursor-pointer text-base text-text">
                    {m.title}
                  </label>
                  <ToggleSwitch
                    id={id}
                    label={m.title}
                    checked={!disabled.includes(m.path)}
                    onChange={(on: boolean) => toggle(m.path, on)}
                  />
                </div>
              );
            })}
          </fieldset>
      </div>
    </fieldset>
  );
}
