import React from "react";
import { Trash2, PlusCircle, Settings as SettingsIcon, RotateCcw, Info, Pen } from "lucide-react";
import LoadingState from "../LoadingState";
import ThemeToggle from "./ThemeButton";
import { SaveButton } from "../CommonButtons"; 
import { useRouter } from "next/router";

interface MoodOption {
  id: string;
  label: string;
  color: string;
}

const DEFAULT_MOODS: MoodOption[] = [
  { id: "m1", label: "Wspaniale", color: "#22c55e" }, 
  { id: "m2", label: "Dobrze", color: "#3b82f6" },    
  { id: "m3", label: "Neutralnie", color: "#eab308" },
  { id: "m4", label: "Źle", color: "#f97316" },       
  { id: "m5", label: "Okropnie", color: "#ef4444" },  
];

interface SettingsFormProps {
  settings: any;
  saving: boolean;
  onSettingsChange: (settings: any) => void;
  onAddUser: () => void;
  onRemoveUser: (idx: number) => void;
  onUpdateUser: (idx: number, value: string) => void;
  onSave: (e: React.SyntheticEvent<HTMLFormElement>) => void;
  onRestoreDefaults: () => void;
}

export default function SettingsForm({
  settings, 
  saving, 
  onSettingsChange, 
  onAddUser, 
  onRemoveUser, 
  onUpdateUser, 
  onSave,
  onRestoreDefaults
}: SettingsFormProps) {
  
  const PRESET_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7"];
  const router = useRouter();

  // Odczyt bezpośrednio z obiektu 'settings' przekazanego przez bazę danych
  const moodEnabled = settings?.show_mood_tracker ?? false;
  const moodOptions = settings?.mood_options ?? DEFAULT_MOODS;

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); 
    onSave(e);
  };

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
    <form onSubmit={handleFormSubmit} className="form-card mb-6">
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
        
        {/* Niestandardowy przełącznik dla nastrojów */}
        <div className="flex items-center justify-between py-2">
          <label htmlFor="show_mood_tracker" className="text-sm font-medium text-text cursor-pointer select-none">
            Pokaż śledzenie nastroju
          </label>
          <button
            id="show_mood_tracker"
            type="button"
            onClick={() => onSettingsChange({ ...settings, show_mood_tracker: !moodEnabled })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              moodEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'
            }`}
            role="switch"
            aria-checked={moodEnabled}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                moodEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

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

      {moodEnabled && (
        <div className="mt-2 p-4 bg-surface border border-gray-100 dark:border-gray-800 rounded-xl mb-6"> 
          <h4 className="text-xs font-bold uppercase tracking-wider text-textMuted mb-3">Nastroje</h4>
          {moodOptions.map((opt: MoodOption, index: number) => (
            <div key={opt.id} className="flex flex-col sm:flex-row items-center gap-2 pb-2 mb-4 border-b border-gray-100 dark:border-gray-900 shadow-sm">
              <div className="flex justify-between w-full sm:flex-1">
                <input
                  type="text"
                  value={opt.label}
                  onChange={(e) => {
                    const newOpts = [...moodOptions];
                    newOpts[index].label = e.target.value;
                    onSettingsChange({ ...settings, mood_options: newOpts }); // Zapis natychmiastowy do stanu
                  }}
                  className="input-field flex-1 bg-card"
                  placeholder="Nazwa nastroju..."
                />

                {/* Możesz usunąć każdy nastrój - nawet zostawiając 0 */}
                <button 
                  type="button" 
                  onClick={() => {
                    const newOpts = moodOptions.filter((m: MoodOption) => m.id !== opt.id);
                    onSettingsChange({ ...settings, mood_options: newOpts }); // Skuteczne, natychmiastowe usunięcie
                  }}
                  className="p-1.5 text-textMuted hover:text-red-500 transition-colors ml-2 bg-surface hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg shrink-0"
                  title="Usuń nastrój"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex items-center gap-2 shrink-0 mt-2 sm:mt-0">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      const newOpts = [...moodOptions];
                      newOpts[index].color = color;
                      onSettingsChange({ ...settings, mood_options: newOpts });
                    }}
                    className={`w-5 h-5 md:w-6 md:h-6 rounded-full transition-transform ${opt.color === color ? 'scale-125 ring-2 ring-primary' : 'hover:scale-110'}`}
                    style={{ backgroundColor: color }}
                    title={`Ustaw kolor: ${color}`}
                  />
                ))}
                
                <div 
                  className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 ml-2 shadow-sm ring-1 ring-black/10 dark:ring-white/10"
                  style={{ backgroundColor: opt.color }}
                  title="Wybierz własny kolor"
                >
                  <input 
                    type="color" 
                    value={opt.color} 
                    onChange={(e) => {
                      const newOpts = [...moodOptions];
                      newOpts[index].color = e.target.value;
                      onSettingsChange({ ...settings, mood_options: newOpts });
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  />
                  <Pen className="w-3.5 h-3.5 absolute top-2 left-2 pointer-events-none text-white drop-shadow-md"/>
                </div>
              </div>
            </div>
          ))}
          
          {moodOptions.length < 10 && (
            <button
              type="button"
              onClick={() => {
                const newOpts = [...moodOptions, { id: Date.now().toString(), label: "Nowy nastrój", color: "#3b82f6" }];
                onSettingsChange({ ...settings, mood_options: newOpts });
              }}
              className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors mt-2 p-2"
            >
              <PlusCircle className="w-4 h-4" /> Dodaj nastrój
            </button>
          )}
        </div>
      )}

      {/* Domyślne sortowanie */}
      <div className="mt-2 p-4 bg-surface border border-gray-100 dark:border-gray-800 rounded-xl mb-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-textMuted mb-3">SORTOWANIE</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="sort_order" className="form-label text-xs">Zadania:</label>
            <select
              id="sort_order"
              value={settings.sort_order || "priority"}
              onChange={(e) => onSettingsChange({ ...settings, sort_order: e.target.value })}
              className="input-field"
            >
              <option value="priority">Priorytet</option>
              <option value="due_date">Data wykonania</option>
              <option value="alphabetical">Alfabetycznie A→Z</option>
              <option value="due_date_alphabetical">Data i alfabetycznie</option>
            </select>
          </div>

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
          {settings.users && settings.users.map((u: string, idx: number) => (
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
          {(!settings.users || settings.users.length < 10) && (
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

      {/* PRZYCISKI AKCJI */}
      <div className="pt-6 mt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
        
        <button
          type="button"
          onClick={onRestoreDefaults}
          disabled={saving}
          className="flex items-center text-sm font-medium text-textMuted hover:text-red-500 transition-colors px-2 py-1 disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Przywróć domyślne
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between relative">
            <button
              type="button"
              className="flex items-center gap-2 pl-4 pr-3 py-2 bg-surface hover:bg-gray-50 dark:hover:bg-gray-800 text-textSecondary font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-700 shadow-sm"
              onClick={() => router.push("/guide")}
            >
              Instrukcja 
              <Info className="w-4 h-4"/>
            </button>
          
          <div className="relative">
            {saving && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-black/60 rounded-lg z-10">
                <LoadingState />
              </div>
            )}
            <SaveButton type="submit" disabled={saving} />
          </div>
        </div>

      </div>
    </form>
  );
}