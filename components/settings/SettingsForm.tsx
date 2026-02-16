// components/settings/SettingsForm.tsx
import React from "react";
import { Save, Trash2, PlusCircle, Settings as SettingsIcon } from "lucide-react";
import LoadingState from "../LoadingState";

interface SettingsFormProps {
  settings: {
    sort_order: string;
    show_completed: boolean;
    show_habits: boolean;
    show_water_tracker: boolean;
    show_budget_items: boolean;
    show_notifications: boolean;
    users: string[];
  };
  saving: boolean;
  onSettingsChange: (settings: any) => void;
  onAddUser: () => void;
  onRemoveUser: (idx: number) => void;
  onUpdateUser: (idx: number, value: string) => void;
  onSave: (e: React.FormEvent<HTMLFormElement>) => void;
}

export default function SettingsForm({
  settings,
  saving,
  onSettingsChange,
  onAddUser,
  onRemoveUser,
  onUpdateUser,
  onSave,
}: SettingsFormProps) {
  return (
    <form
      onSubmit={onSave}
      className="mb-4 bg-card p-6 rounded-xl shadow space-y-3"
    >
      <h3 className="text-xl font-semibold flex items-center">
        <SettingsIcon className="w-5 h-5 mr-2 text-gray-600" />
        Ustawienia
      </h3>

      {/* Sort Order */}
      <div>
        <label
          htmlFor="sort_order"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Kolejność sortowania
        </label>
        <select
          id="sort_order"
          value={settings.sort_order}
          onChange={(e) =>
            onSettingsChange({ ...settings, sort_order: e.target.value })
          }
          className="mt-1 w-full p-2 border rounded max-w-xs"
        >
          <option value="priority">Priorytet</option>
          <option value="due_date">Data wykonania</option>
          <option value="alphabetical">Alfabetycznie A→Z</option>
          <option value="due_date_alphabetical">Data i alfabetycznie</option>
        </select>
      </div>

      {/* Show Completed Tasks */}
      <div className="flex items-center justify-start">
        <input
          id="show_completed"
          type="checkbox"
          checked={settings.show_completed}
          onChange={(e) =>
            onSettingsChange({ ...settings, show_completed: e.target.checked })
          }
          className="h-4 w-4 text-primary border-gray-300 rounded"
        />
        <label
          htmlFor="show_completed"
          className="ml-2 text-sm text-gray-700"
        >
          Pokaż zrobione
        </label>
      </div>

      {/* Show Habits */}
      <div className="flex items-center justify-start">
        <input
          id="show_habits"
          type="checkbox"
          checked={settings.show_habits}
          onChange={(e) =>
            onSettingsChange({ ...settings, show_habits: e.target.checked })
          }
          className="h-4 w-4 text-primary border-gray-300 rounded"
        />
        <label htmlFor="show_habits" className="ml-2 text-sm text-gray-700">
          Pokaż sekcję nawyków
        </label>
      </div>

      {/* Show Water Tracker */}
      <div className="flex items-center justify-start">
        <input
          id="show_water_tracker"
          type="checkbox"
          checked={settings.show_water_tracker}
          onChange={(e) =>
            onSettingsChange({
              ...settings,
              show_water_tracker: e.target.checked,
            })
          }
          className="h-4 w-4 text-primary border-gray-300 rounded"
        />
        <label
          htmlFor="show_water_tracker"
          className="ml-2 text-sm text-gray-700"
        >
          Pokaż tracker wody
        </label>
      </div>

      {/* Show Notifications */}
      <div className="flex items-center justify-start">
        <input
          id="show_notifications"
          type="checkbox"
          checked={settings.show_notifications}
          onChange={(e) =>
            onSettingsChange({
              ...settings,
              show_notifications: e.target.checked,
            })
          }
          className="h-4 w-4 text-primary border-gray-300 rounded"
        />
        <label
          htmlFor="show_notifications"
          className="ml-2 text-sm text-gray-700"
        >
          Pokaż zadania cykliczne
        </label>
      </div>

      {/* Show Budget Items */}
      <div className="flex items-center justify-start">
        <input
          id="show_budget_items"
          type="checkbox"
          checked={settings.show_budget_items}
          onChange={(e) =>
            onSettingsChange({
              ...settings,
              show_budget_items: e.target.checked,
            })
          }
          className="h-4 w-4 text-primary border-gray-300 rounded"
        />
        <label
          htmlFor="show_budget_items"
          className="ml-2 text-sm text-gray-700"
        >
          Pokaż pozycje z budżetu
        </label>
      </div>

      {/* Friends List */}
      <div className="space-y-2 pt-2">
        <label className="block text-sm font-medium text-gray-700">
          Znajomi (max 10)
        </label>
        {settings.users.map((u: string, idx: number) => (
          <div key={idx} className="flex items-center space-x-2">
            <input
              type="email"
              value={u}
              placeholder="Email znajomego"
              onChange={(e) => onUpdateUser(idx, e.target.value)}
              className="flex-1 p-2 border rounded"
            />
            <button
              type="button"
              onClick={() => onRemoveUser(idx)}
              className="p-2 bg-red-100 rounded-lg text-red-500 hover:bg-red-200"
              title="usuń"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {settings.users.length < 10 && (
          <button
            type="button"
            onClick={onAddUser}
            className="flex items-center rounded-lg space-x-1 text-primary hover:text-secondary"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Dodaj znajomego</span>
          </button>
        )}
      </div>

      {/* Save Button */}
      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 bg-primary hover:bg-secondary text-white rounded-lg flex items-center transition disabled:opacity-50"
      >
        {saving ? (
          <>
            Zapisywanie…
            <span className="ml-2">
              <LoadingState />
            </span>
          </>
        ) : (
          <>
            Zapisz
            <Save className="w-5 h-5 ml-2" />
          </>
        )}
      </button>
    </form>
  );
}