import React from "react";
import { Save, Trash2, PlusCircle, Settings as SettingsIcon } from "lucide-react";
import LoadingState from "../LoadingState";
import ThemeToggle from "./ThemeButton";

interface SettingsFormProps {
  settings: any;
  saving: boolean;
  onSettingsChange: (settings: any) => void;
  onAddUser: () => void;
  onRemoveUser: (idx: number) => void;
  onUpdateUser: (idx: number, value: string) => void;
  onSave: (e: React.SyntheticEvent<HTMLFormElement>) => void;
}

export default function SettingsForm({
  settings, saving, onSettingsChange, onAddUser, onRemoveUser, onUpdateUser, onSave,
}: SettingsFormProps) {
  return (
    <form onSubmit={onSave} className="form-card mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-semibold flex items-center text-text">
          <SettingsIcon className="w-5 h-5 mr-2 text-textMuted" />
          Ustawienia aplikacji
        </h3>
        <ThemeToggle />
      </div>

      {/* Sort Order */}
      <div>
        <label htmlFor="sort_order" className="form-label">Kolejność sortowania (Zadania):</label>
        <select
          id="sort_order"
          value={settings.sort_order}
          onChange={(e) => onSettingsChange({ ...settings, sort_order: e.target.value })}
          className="input-field max-w-xs"
        >
          <option value="priority">Priorytet</option>
          <option value="due_date">Data wykonania</option>
          <option value="alphabetical">Alfabetycznie A→Z</option>
          <option value="due_date_alphabetical">Data i alfabetycznie</option>
        </select>
      </div>

      {/* Toggles */}
      <div className="space-y-3 py-2">
        {[
          { id: "show_completed", label: "Pokaż wykonane zadania" },
          { id: "show_habits", label: "Pokaż sekcję nawyków" },
          { id: "show_water_tracker", label: "Pokaż tracker wody" },
          { id: "show_notifications", label: "Pokaż zadania cykliczne" },
          { id: "show_budget_items", label: "Pokaż pozycje z budżetu" },
        ].map(({ id, label }) => (
          <div key={id} className="flex items-center">
            <input
              id={id}
              type="checkbox"
              checked={settings[id]}
              onChange={(e) => onSettingsChange({ ...settings, [id]: e.target.checked })}
              className="h-4 w-4 text-primary bg-transparent border-gray-300 dark:border-gray-600 rounded focus:ring-primary transition-colors"
            />
            <label htmlFor={id} className="ml-2 text-sm text-text">{label}</label>
          </div>
        ))}
      </div>

      {/* Friends List */}
      <div className=" border-t border-gray-100 dark:border-gray-800">
        <label className="form-label">Zaufani użytkownicy:</label>
        <div className="space-y-2 max-w-md">
          {settings.users.map((u: string, idx: number) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="email"
                value={u}
                placeholder="Email użytkownika"
                onChange={(e) => onUpdateUser(idx, e.target.value)}
                className="input-field"
              />
              <button
                type="button"
                onClick={() => onRemoveUser(idx)}
                className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                title="Usuń"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
          {settings.users.length < 10 && (
            <button
              type="button"
              onClick={onAddUser}
              className="text-sm font-medium text-primary hover:text-secondary flex items-center mt-2"
            >
              <PlusCircle className="w-4 h-4 mr-1" /> Dodaj użytkownika
            </button>
          )}
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-primary hover:bg-secondary text-white font-medium rounded-lg flex items-center transition-colors disabled:opacity-50 justify-center w-full"
        >
          {saving ? <><span className="mr-2">Zapisywanie...</span><LoadingState /></> : <>Zapisz<Save className="w-5 h-5 ml-2" /></>}
        </button>
      </div>
    </form>
  );
}