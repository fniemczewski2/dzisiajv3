// components/settings/SettingsSection.tsx
//
// Sekcja ustawień z własnym zapisem. Trzyma kopię roboczą tylko swoich pól,
// więc „Zapisz” w jednej sekcji nie rusza niezapisanych zmian w innej.
// Przycisk jest aktywny, gdy w sekcji coś się zmieniło.

import React, { ReactNode, useEffect, useId, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { Settings } from "@/types/settings";
import { SaveButton } from "@/components/ui/CommonButtons";

export type SectionDraft<K extends keyof Settings> = Pick<Settings, K>;
export type SetField<K extends keyof Settings> = <F extends K>(field: F, value: Settings[F]) => void;

interface Props<K extends keyof Settings> {
  /** Kotwica (#id) – do nawigacji po sekcjach. */
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  keys: readonly K[];
  settings: Settings;
  defaults: Settings;
  /** Zapis tylko pól tej sekcji; true = zapisano. */
  onSave: (patch: SectionDraft<K>) => Promise<boolean>;
  /** Dodatkowe działania po udanym zapisie (np. przeniesienie zadań do nowej nazwy kategorii). */
  afterSave?: () => void;
  children: (draft: SectionDraft<K>, set: SetField<K>) => ReactNode;
}

function pick<K extends keyof Settings>(settings: Settings, keys: readonly K[]): SectionDraft<K> {
  const out = {} as SectionDraft<K>;
  for (const k of keys) out[k] = settings[k];
  return out;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export default function SettingsSection<K extends keyof Settings>({
  id,
  title,
  description,
  icon,
  keys,
  settings,
  defaults,
  onSave,
  afterSave,
  children,
}: Readonly<Props<K>>) {
  const headingId = useId();
  const saved = useMemo(() => pick(settings, keys), [settings, keys]);
  const savedKey = JSON.stringify(saved);
  const [draft, setDraft] = useState<SectionDraft<K>>(saved);
  const [saving, setSaving] = useState(false);

  // Nowe wartości z bazy (np. zapis tej sekcji albo zmiana w innej karcie) –
  // tylko dla pól tej sekcji, więc inne sekcje nie tracą swoich zmian.
  useEffect(() => {
    setDraft(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  const dirty = keys.some((k) => !same(draft[k], saved[k]));
  const set: SetField<K> = (field, value) => setDraft((d) => ({ ...d, [field]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty) return;
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    if (ok) afterSave?.();
  };

  const restoreDefaults = () => setDraft(pick(defaults, keys));
  const isDefault = keys.every((k) => same(draft[k], defaults[k]));

  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-20">
      <form onSubmit={(e) => void submit(e)} className="form-card mb-6 max-w-3xl">
        <div>
          <h2 id={headingId} className="flex items-center gap-2 text-lg font-bold text-text">
            {icon}
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
        </div>

        {children(draft, set)}

        <div className="flex flex-col-reverse items-center justify-between gap-3 border-t border-line pt-4 sm:flex-row">
          <button
            type="button"
            onClick={restoreDefaults}
            disabled={isDefault || saving}
            className="flex min-h-11 items-center gap-2 px-2 text-sm font-medium text-text-secondary hover:underline disabled:opacity-40 disabled:no-underline"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Domyślne w tej sekcji
          </button>
          <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
            <span aria-live="polite" className="text-sm text-text-secondary">
              {dirty ? "Niezapisane zmiany" : ""}
            </span>
            <SaveButton loading={saving} disabled={!dirty} />
          </div>
        </div>
      </form>
    </section>
  );
}
