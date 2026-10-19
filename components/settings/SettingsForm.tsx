// components/settings/SettingsForm.tsx
//
// Ustawienia podzielone na sekcje tematyczne. Każda sekcja ma własną kopię
// roboczą i własny przycisk „Zapisz” – zapisuje tylko swoje pola.
// Sekcje, które zapisują się od razu (powiadomienia, szablony, profile
// finansowe, Slack…), są na stronie Ustawień poniżej tych formularzy.

import { useMoodConsent } from "@/hooks/useMoodConsent";
import { MAX_TRUSTED_USERS } from "@/config/limits";
import { CATEGORY_PALETTE, isPaletteColor } from "@/lib/categoryColors";
import { DEFAULT_MOODS } from "@/config/defaults";
import React, { useState } from "react";
import { ArrowDownUp, CheckSquare, Coins, LayoutGrid, PlusCircle, Smile, Users } from "lucide-react";
import ThemeToggle from "./ThemeButton";
import { DeleteButton, ToggleSwitch } from "../ui/CommonButtons";
import { MoodOption } from "@/types/moods";
import { Settings } from "@/types/settings";
import SettingsSection, { type SetField } from "./SettingsSection";
import TaskCategoriesEditor from "@/components/settings/TaskCategoriesEditor";
import CategoryColorPicker from "@/components/settings/CategoryColorPicker";
import HabitsEditor from "@/components/settings/HabitsEditor";
import ModulesEditor from "@/components/settings/ModulesEditor";
import FinanceSettings from "@/components/settings/FinanceSettings";
import { resolveHabits } from "@/lib/habits";
import { applyTaskCategoryRenames } from "@/hooks/useTaskCategories";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

/** Spis sekcji – do nawigacji na górze strony. */
export const SETTINGS_SECTIONS = [
  { id: "ogolne", title: "Ogólne" },
  { id: "zadania", title: "Zadania" },
  { id: "nawyki", title: "Nawyki i plan dnia" },
  { id: "finanse", title: "Finanse" },
  { id: "sortowanie", title: "Sortowanie" },
  { id: "udostepnianie", title: "Udostępnianie" },
] as const;

interface SettingsFormProps {
  settings: Settings;
  defaults: Settings;
  /** Zapis wybranych pól; true = zapisano. */
  onSavePartial: (patch: Partial<Settings>) => Promise<boolean>;
}

function Switch({
  id,
  label,
  checked,
  onChange,
}: Readonly<{ id: string; label: string; checked: boolean; onChange: (v: boolean) => void }>) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <label htmlFor={id} className="cursor-pointer text-sm font-medium text-text select-none">
        {label}
      </label>
      <ToggleSwitch id={id} label={label} checked={checked} onChange={onChange} />
    </div>
  );
}

function SortSelect({
  id,
  label,
  value,
  options,
  onChange,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (v: string) => void;
}>) {
  return (
    <div>
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input-field">
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

function MoodsEditor({ value, onChange }: Readonly<{ value: MoodOption[]; onChange: (next: MoodOption[]) => void }>) {
  const patch = (index: number, change: Partial<MoodOption>) =>
    onChange(value.map((m, i) => (i === index ? { ...m, ...change } : m)));
  return (
    <fieldset className="min-w-0 rounded-xl border border-line p-4">
      <legend className="px-1 text-sm font-semibold text-text">Nastroje</legend>
      {value.map((opt, index) => (
        <div key={opt.id} className="mb-3 flex flex-col items-center gap-2 sm:flex-row">
          <div className="flex w-full justify-between gap-2 sm:flex-1">
            <input
              type="text"
              aria-label={`Nazwa nastroju ${index + 1}`}
              value={opt.label}
              onChange={(e) => patch(index, { label: e.target.value })}
              className="input-field flex-1"
              placeholder="Nazwa nastroju..."
            />
            <DeleteButton
              small
              ariaLabel={`Usuń nastrój ${opt.label}`}
              onClick={() => onChange(value.filter((m) => m.id !== opt.id))}
            />
          </div>
          <CategoryColorPicker
            categoryName={opt.label}
            subject="nastroju"
            allowNone={false}
            value={isPaletteColor(opt.color) ? opt.color : null}
            onChange={(color) => patch(index, { color: color ?? DEFAULT_MOODS[0].color })}
          />
        </div>
      ))}
      {value.length < 10 && (
        <button
          type="button"
          onClick={() =>
            onChange([...value, { id: crypto.randomUUID(), label: "Nowy nastrój", color: CATEGORY_PALETTE[0].value }])
          }
          className="flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" /> Dodaj nastrój
        </button>
      )}
    </fieldset>
  );
}

/** Stan zgody na moduł nastroju i jej cofnięcie (usuwa wpisy). */
function MoodConsentControl() {
  const { hasConsent, consentAt, revoke } = useMoodConsent();
  if (!hasConsent) return null;
  const since = consentAt ? new Date(consentAt).toLocaleDateString("pl-PL") : null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm">
      <span className="text-text-secondary">Zgoda na zapis nastroju{since ? ` od ${since}` : ""}.</span>
      <button
        type="button"
        onClick={() => void revoke()}
        className="min-h-11 font-semibold text-danger hover:underline"
      >
        Cofnij zgodę i usuń wpisy
      </button>
    </div>
  );
}

export default function SettingsForm({ settings, defaults, onSavePartial }: Readonly<SettingsFormProps>) {
  const { user, supabase } = useAuth();
  const { toast } = useToast();
  const [categoryRenames, setCategoryRenames] = useState<Array<[string, string]>>([]);
  const common = { settings, defaults, onSave: (patch: Partial<Settings>) => onSavePartial(patch) };
  const on = (v: boolean | undefined) => v !== false;

  const applyRenames = () => {
    if (!user || categoryRenames.length === 0) return;
    const renames = categoryRenames;
    setCategoryRenames([]);
    void applyTaskCategoryRenames(supabase, user.id, renames).then(({ failed }) => {
      if (failed > 0) toast.error("Nie udało się przenieść części zadań do kategorii o nowej nazwie.");
    });
  };

  return (
    <>
      <SettingsSection
        {...common}
        id="ogolne"
        title="Ogólne"
        description="Ekran startowy, motyw i moduły widoczne w menu."
        icon={<LayoutGrid className="h-5 w-5 text-text-secondary" aria-hidden="true" />}
        keys={["main_view", "disabled_modules"] as const}
      >
        {(d, set: SetField<"main_view" | "disabled_modules">) => (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-48 flex-1">
                <label htmlFor="main_view" className="form-label">
                  Widok główny:
                </label>
                <select
                  id="main_view"
                  value={d.main_view || "calendar"}
                  onChange={(e) => set("main_view", e.target.value)}
                  className="input-field"
                >
                  <option value="calendar">Kalendarz</option>
                  <option value="tasks">Zadania</option>
                  <option value="day_view">Plan dnia</option>
                </select>
              </div>
              <div className="flex min-h-11 items-center gap-2 text-sm text-text-secondary">
                Motyw: <ThemeToggle />
              </div>
            </div>
            <ModulesEditor
              disabled={d.disabled_modules ?? []}
              onChange={(next) => set("disabled_modules", next.length > 0 ? next : null)}
            />
          </>
        )}
      </SettingsSection>

      <SettingsSection
        {...common}
        id="zadania"
        title="Zadania"
        description="Co widać na liście zadań oraz kategorie z kolorami."
        icon={<CheckSquare className="h-5 w-5 text-text-secondary" aria-hidden="true" />}
        keys={
          ["show_completed", "show_notifications", "hide_priority_5", "task_categories", "category_colors"] as const
        }
        afterSave={applyRenames}
      >
        {(d, set) => (
          <>
            <div>
              <Switch
                id="show_completed"
                label="Pokaż wykonane zadania"
                checked={on(d.show_completed)}
                onChange={(v) => set("show_completed", v)}
              />
              <Switch
                id="show_notifications"
                label="Pokaż zadania cykliczne"
                checked={on(d.show_notifications)}
                onChange={(v) => set("show_notifications", v)}
              />
              <Switch
                id="hide_priority_5"
                label="Ukryj priorytet 5 (Ludzie)"
                checked={on(d.hide_priority_5)}
                onChange={(v) => set("hide_priority_5", v)}
              />
            </div>
            <TaskCategoriesEditor
              value={d.task_categories}
              onChange={(next) => set("task_categories", next)}
              onRenamesChange={setCategoryRenames}
              colors={d.category_colors}
              onColorsChange={(next) => set("category_colors", next)}
            />
          </>
        )}
      </SettingsSection>

      <SettingsSection
        {...common}
        id="nawyki"
        title="Nawyki i plan dnia"
        description="Nawyki, woda i nastrój na planie dnia."
        icon={<Smile className="h-5 w-5 text-text-secondary" aria-hidden="true" />}
        keys={["show_habits", "custom_habits", "show_water_tracker", "show_mood_tracker", "mood_options"] as const}
      >
        {(d, set) => (
          <>
            <div>
              <Switch
                id="show_habits"
                label="Pokaż sekcję nawyków"
                checked={on(d.show_habits)}
                onChange={(v) => set("show_habits", v)}
              />
              <Switch
                id="show_water_tracker"
                label="Pokaż tracker wody"
                checked={on(d.show_water_tracker)}
                onChange={(v) => set("show_water_tracker", v)}
              />
              <Switch
                id="show_mood_tracker"
                label="Pokaż śledzenie nastroju"
                checked={Boolean(d.show_mood_tracker)}
                onChange={(v) => set("show_mood_tracker", v)}
              />
            </div>
            {d.show_habits !== false && (
              <HabitsEditor
                value={resolveHabits({ ...settings, ...d })}
                onChange={(next) => set("custom_habits", next)}
              />
            )}
            {d.show_mood_tracker && (
              <MoodsEditor value={d.mood_options ?? DEFAULT_MOODS} onChange={(next) => set("mood_options", next)} />
            )}
            <MoodConsentControl />
          </>
        )}
      </SettingsSection>

      <SettingsSection
        {...common}
        id="finanse"
        title="Finanse"
        description="Profile finansowe zapisują się od razu; pozostałe pola – przyciskiem „Zapisz”."
        icon={<Coins className="h-5 w-5 text-text-secondary" aria-hidden="true" />}
        keys={["show_budget_items", "daily_spending_categories"] as const}
      >
        {(d, set) => (
          <>
            <Switch
              id="show_budget_items"
              label="Pokaż planowane wydatki"
              checked={on(d.show_budget_items)}
              onChange={(v) => set("show_budget_items", v)}
            />
            <FinanceSettings
              dailyCategories={d.daily_spending_categories ?? []}
              onDailyCategoriesChange={(next) => set("daily_spending_categories", next)}
            />
          </>
        )}
      </SettingsSection>

      <SettingsSection
        {...common}
        id="sortowanie"
        title="Sortowanie"
        description="Domyślna kolejność na listach."
        icon={<ArrowDownUp className="h-5 w-5 text-text-secondary" aria-hidden="true" />}
        keys={
          [
            "sort_order",
            "sort_notes",
            "sort_shopping",
            "sort_movies",
            "sort_recipes",
            "sort_people",
            "sort_bills",
          ] as const
        }
      >
        {(d, set) => (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SortSelect
              id="sort_order"
              label="Zadania:"
              value={d.sort_order || "priority"}
              onChange={(v) => set("sort_order", v)}
              options={[
                ["priority", "Priorytet"],
                ["due_date", "Data wykonania"],
                ["alphabetical", "Alfabetycznie"],
                ["due_date_alphabetical", "Data i alfabetycznie"],
              ]}
            />
            <SortSelect
              id="sort_notes"
              label="Notatki:"
              value={d.sort_notes || "updated_desc"}
              onChange={(v) => set("sort_notes", v)}
              options={[
                ["updated_desc", "Data aktualizacji"],
                ["alphabetical", "Alfabetycznie"],
              ]}
            />
            <SortSelect
              id="sort_shopping"
              label="Listy zakupów:"
              value={d.sort_shopping || "updated_desc"}
              onChange={(v) => set("sort_shopping", v)}
              options={[
                ["updated_desc", "Data aktualizacji"],
                ["alphabetical", "Alfabetycznie"],
              ]}
            />
            <SortSelect
              id="sort_movies"
              label="Filmy i seriale:"
              value={d.sort_movies || "updated_desc"}
              onChange={(v) => set("sort_movies", v)}
              options={[
                ["updated_desc", "Data aktualizacji"],
                ["alphabetical", "Alfabetycznie"],
                ["rating", "Wg oceny"],
              ]}
            />
            <SortSelect
              id="sort_recipes"
              label="Przepisy:"
              value={d.sort_recipes || "category"}
              onChange={(v) => set("sort_recipes", v)}
              options={[
                ["category", "Kategorie"],
                ["alphabetical", "Alfabetycznie"],
                ["created_desc", "Data dodania"],
              ]}
            />
            <SortSelect
              id="sort_people"
              label="Ludzie:"
              value={d.sort_people || "alphabetical"}
              onChange={(v) => set("sort_people", v)}
              options={[
                ["alphabetical", "Alfabetycznie"],
                ["priority", "Priorytet"],
              ]}
            />
            <SortSelect
              id="sort_bills"
              label="Rachunki:"
              value={d.sort_bills || "month"}
              onChange={(v) => set("sort_bills", v)}
              options={[
                ["month", "Wg miesięcy"],
                ["category", "Wg kategorii"],
              ]}
            />
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        {...common}
        id="udostepnianie"
        title="Udostępnianie"
        description="Zaufane osoby, którym możesz udostępniać zadania i wydarzenia (do 10)."
        icon={<Users className="h-5 w-5 text-text-secondary" aria-hidden="true" />}
        keys={["users"] as const}
      >
        {(d, set) => {
          const users = d.users ?? [];
          return (
            <fieldset className="max-w-md min-w-0 space-y-2">
              <legend className="sr-only">Zaufani użytkownicy</legend>
              {users.map((u, idx) => (
                <div key={`user-${idx}`} className="flex items-center gap-2">
                  <label htmlFor={`trusted-user-${idx}`} className="sr-only">
                    Adres e-mail zaufanej osoby {idx + 1}
                  </label>
                  <input
                    id={`trusted-user-${idx}`}
                    type="email"
                    value={u}
                    placeholder="E-mail"
                    onChange={(e) =>
                      set(
                        "users",
                        users.map((x, i) => (i === idx ? e.target.value : x))
                      )
                    }
                    className="input-field"
                  />
                  <DeleteButton
                    small
                    ariaLabel={"Usuń " + (u || "osobę " + (idx + 1))}
                    onClick={() =>
                      set(
                        "users",
                        users.filter((_, i) => i !== idx)
                      )
                    }
                  />
                </div>
              ))}
              {users.length < MAX_TRUSTED_USERS ? (
                <button
                  type="button"
                  onClick={() => set("users", [...users, ""])}
                  className="flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <PlusCircle className="h-4 w-4" aria-hidden="true" /> Dodaj osobę
                </button>
              ) : (
                <p className="text-sm text-text-secondary">
                  Osiągnięto limit {MAX_TRUSTED_USERS} zaufanych osób. Usuń kogoś z listy, aby dodać nową osobę.
                </p>
              )}
            </fieldset>
          );
        }}
      </SettingsSection>
    </>
  );
}
