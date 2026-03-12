import React from "react";
import { Save, Trash2, PlusCircle, Settings as SettingsIcon, ArrowUpDown } from "lucide-react";
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
  
  // Pomocnicza funkcja do renderowania suwaków
  const renderSwitch = (id: string, label: string) => {
    const isChecked = settings[id] !== false;

    return (
      <div key={id} className="flex items-center justify-between py-2">
        <label htmlFor={id} className="text-sm font-medium text-text cursor-pointer select-none">
          {label}
        </label>
        <button
          id={id}
          type="button"
          onClick={() => onSettingsChange({ ...settings, [id]: !isChecked })}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isChecked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'
          }`}
          role="switch"
          aria-checked={isChecked}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
              isChecked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    );
  };

  return (
    <form onSubmit={onSave} className="form-card mb-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-xl font-semibold flex items-center text-text">
          <SettingsIcon className="w-5 h-5 mr-2 text-textMuted" />
          Ustawienia aplikacji
        </h3>
        <ThemeToggle />
      </div>

      {/* Toggles Główne */}
      <div className="space-y-1 mb-6">
        {renderSwitch("show_completed", "Pokaż wykonane zadania")}
        {renderSwitch("show_water_tracker", "Pokaż tracker wody")}
        {renderSwitch("show_notifications", "Pokaż zadania cykliczne")}
        {renderSwitch("show_budget_items", "Pokaż planowane wydatki")}
        
        {renderSwitch("show_habits", "Pokaż sekcję nawyków")}

        {settings.show_habits && (
          <div className="mt-2 p-4 bg-surface border border-gray-100 dark:border-gray-800 rounded-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-textMuted mb-3">Aktywne nawyki</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              {renderSwitch("habit_pills", "Leki")}
              {renderSwitch("habit_bath", "Higiena")}
              {renderSwitch("habit_workout", "Trening")}
              {renderSwitch("habit_friends", "Relacje")}
              {renderSwitch("habit_work", "Praca / Rozwój")}
              {renderSwitch("habit_housework", "Dom / Porządki")}
              {renderSwitch("habit_plants", "Higiena cyfrowa")}
              {renderSwitch("habit_duolingo", "Języki obce")}
            </div>
          </div>
        )}
      </div>

      {/* Domyślne sortowanie (NOWA SEKCJA) */}
      <div className="mt-2 p-4 bg-surface border border-gray-100 dark:border-gray-800 rounded-xl">
        <h4 className="text-xs font-bold uppercase tracking-wider text-textMuted mb-3">SORTOWANIE</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Zadania */}
          <div>
            <label htmlFor="sort_order" className="form-label text-xs">Zadania:</label>
            <select
              id="sort_order"
              value={settings.sort_order}
              onChange={(e) => onSettingsChange({ ...settings, sort_order: e.target.value })}
              className="input-field"
            >
              <option value="priority">Priorytet</option>
              <option value="due_date">Data wykonania</option>
              <option value="alphabetical">Alfabetycznie A→Z</option>
              <option value="due_date_alphabetical">Data i alfabetycznie</option>
            </select>
          </div>

          {/* Notatki */}
          <div>
            <label htmlFor="sort_notes" className="form-label text-xs">Notatki:</label>
            <select
              id="sort_notes"
              value={settings.sort_notes || "updated_desc"}
              onChange={(e) => onSettingsChange({ ...settings, sort_notes: e.target.value })}
              className="input-field"
            >
              <option value="updated_desc">Data aktualizacji</option>
              <option value="alphabetical">Alfabetycznie A→Z</option>
            </select>
          </div>

          {/* Listy zakupów */}
          <div>
            <label htmlFor="sort_shopping" className="form-label text-xs">Listy zakupów:</label>
            <select
              id="sort_shopping"
              value={settings.sort_shopping || "updated_desc"}
              onChange={(e) => onSettingsChange({ ...settings, sort_shopping: e.target.value })}
              className="input-field"
            >
              <option value="updated_desc">Data aktualizacji</option>
              <option value="alphabetical">Alfabetycznie A→Z</option>
            </select>
          </div>

          {/* Filmy */}
          <div>
            <label htmlFor="sort_movies" className="form-label text-xs">Filmy:</label>
            <select
              id="sort_movies"
              value={settings.sort_movies || "updated_desc"}
              onChange={(e) => onSettingsChange({ ...settings, sort_movies: e.target.value })}
              className="input-field"
            >
              <option value="updated_desc">Data aktualizacji</option>
              <option value="alphabetical">Alfabetycznie A→Z</option>
              <option value="rating">Wg oceny</option>
            </select>
          </div>

          {/* Przepisy */}
          <div>
            <label htmlFor="sort_recipes" className="form-label text-xs">Przepisy:</label>
            <select
              id="sort_recipes"
              value={settings.sort_recipes || "category"}
              onChange={(e) => onSettingsChange({ ...settings, sort_recipes: e.target.value })}
              className="input-field"
            >
              <option value="category">Kategorie</option>
              <option value="alphabetical">Alfabetycznie A→Z</option>
              <option value="created_desc">Data dodania</option>
            </select>
          </div>

          {/* Miejsca */}
          <div>
            <label htmlFor="sort_places" className="form-label text-xs">Miejsca:</label>
            <select
              id="sort_places"
              value={settings.sort_places || "alphabetical"}
              onChange={(e) => onSettingsChange({ ...settings, sort_places: e.target.value })}
              className="input-field"
            >
              <option value="alphabetical">Alfabetycznie A→Z</option>
              <option value="distance">Odległość (najbliższe)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Friends List */}
      <div className="pt-6 border-t border-gray-100 dark:border-gray-800 mb-6">
        <label className="form-label">Zaufani użytkownicy (Udostępnianie):</label>
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
                className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors shrink-0"
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
              className="text-sm font-medium text-primary hover:text-secondary flex items-center mt-3"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" /> Dodaj użytkownika
            </button>
          )}
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-primary hover:bg-secondary text-white font-medium rounded-lg flex items-center transition-colors disabled:opacity-50 justify-center w-full sm:w-auto"
        >
          {saving ? (
            <><span className="mr-2">Zapisywanie...</span><LoadingState /></>
          ) : (
            <>Zapisz ustawienia <Save className="w-5 h-5 ml-2" /></>
          )}
        </button>
      </div>
    </form>
  );
}