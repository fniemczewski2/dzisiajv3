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
  const groups = [...new Set(TOGGLEABLE_MODULES.map((m) => m.group))];
  const enabledCount = TOGGLEABLE_MODULES.length - disabled.length;

  const toggle = (path: string, on: boolean) =>
    onChange(on ? disabled.filter((p) => p !== path) : [...disabled, path]);

  return (
    <section className="mt-2 rounded-xl border border-line p-4" aria-labelledby="modules-heading">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h4 id="modules-heading" className="text-sm font-semibold text-text">Moduły</h4>
        <span className="text-sm text-text-secondary tabular-nums">
          {enabledCount}/{TOGGLEABLE_MODULES.length} włączonych
        </span>
      </div>
      <p className="mb-3 text-sm text-text-secondary">
        Wyłącz to, z czego nie korzystasz – zniknie z menu i wyszukiwarki. Dane zostają i wrócą po włączeniu.
        Dzisiaj, Zadania, Kalendarz i Ustawienia są zawsze dostępne.
      </p>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {groups.map((group) => (
          <fieldset key={group}>
            <legend className="mb-1 text-sm font-semibold text-text-secondary">{group}</legend>
            {TOGGLEABLE_MODULES.filter((m) => m.group === group).map((m) => {
              const id = `module-${m.path.replaceAll("/", "-")}`;
              return (
                <div key={m.path} className="flex min-h-11 items-center justify-between gap-3">
                  <label htmlFor={id} className="cursor-pointer text-base text-text">{m.title}</label>
                  <ToggleSwitch id={id} checked={!disabled.includes(m.path)} onChange={(on: boolean) => toggle(m.path, on)} />
                </div>
              );
            })}
          </fieldset>
        ))}
      </div>
    </section>
  );
}
