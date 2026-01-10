// components/streaks/StreakCard.tsx
"use client";

import React, { useState } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { 
  Flame, 
  Trophy, 
  Target, 
  Heart, 
  Cigarette,
  Beer,
  UtensilsCrossed,
  Dumbbell,
  Edit2,
  Trash2,
  Check,
  X,
  PiggyBank,
  BriefcaseMedical,
  Save
} from "lucide-react";
import { Streak } from "../../types";

interface StreakCardProps {
  streak: Streak;
  onEdit: (s: Streak) => void;
  onDelete: (id: string) => void;
}

const ICON_MAP: { [key: string]: React.ComponentType<any> } = {
  flame: Flame,
  trophy: Trophy,
  target: Target,
  heart: Heart,
  cigarette: Cigarette,
  beer: Beer,
  utensils: UtensilsCrossed,
  dumbbell: Dumbbell,
  piggybank: PiggyBank,
  medical: BriefcaseMedical,
};

const ICONS = [
  { name: "flame", icon: Flame },
  { name: "trophy", icon: Trophy },
  { name: "target", icon: Target},
  { name: "heart", icon: Heart },
  { name: "cigarette", icon: Cigarette },
  { name: "beer", icon: Beer },
  { name: "utensils", icon: UtensilsCrossed},
  { name: "dumbbell", icon: Dumbbell },
  { name: "piggybank", icon: PiggyBank },
  { name: "medical", icon: BriefcaseMedical }, 
];

const COLOR_MAP: { [key: string]: { bg: string; text: string } } = {
  zinc: { bg: "bg-zinc-50", text: "text-zinc-600" },
  yellow: { bg: "bg-yellow-100", text: "text-yellow-600" },
  green: { bg: "bg-green-100", text: "text-green-600" },
  cyan: { bg: "bg-cyan-100", text: "text-cyan-600"},
  red: { bg: "bg-red-100", text: "text-red-600" },
};

const COLORS = [
  { name: "zinc", class: "bg-zinc-500" },
  { name: "yellow", class: "bg-yellow-500" },
  { name: "green", class: "bg-green-500" },
  { name: "cyan", class: "bg-cyan-500" },
  { name: "red", class: "bg-red-500" },
];

const COLORS_EDIT = [
  { name: "zinc", class: "bg-zinc-100" },
  { name: "yellow", class: "bg-yellow-200" },
  { name: "green", class: "bg-green-200" },
  { name: "cyan", class: "bg-cyan-200" },
  { name: "red", class: "bg-red-200" },
];

export default function StreakCard({ streak, onEdit, onDelete }: StreakCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(streak.name);
  const [editedDate, setEditedDate] = useState(streak.start_date);
  const [editedIcon, setEditedIcon] = useState(streak.icon || "flame");
  const [editedColor, setEditedColor] = useState(streak.color || "zinc");
  const [showIconPicker, setShowIconPicker] = useState(false);

  const days = differenceInDays(new Date(), parseISO(streak.start_date));
  const Icon = ICON_MAP[isEditing ? editedIcon : (streak.icon || "flame")];
  const colors = COLOR_MAP[isEditing ? editedColor : (streak.color || "zinc")];

  const getMilestoneMessage = (days: number): string => {
    if (days === 0) return "Dobry start!";
    if (days === 7) return "Pierwszy tydzień!";
    if (days === 30) return "Pierwszy miesiąc!";
    if (days === 61) return "Dwa miesiące!";
    if (days === 91) return "Trzy miesiące!";
    if (days === 122) return "Cztery miesiące!";
    if (days === 100) return "100 dni!";
    if (days === 365) return "ROK!";
    if (days % 100 === 0) return `${days} dni! Kontynuuj!`;
    if (days / 30 > 4 && days % 30 === 0) return `${Math.floor(days / 30)} miesięcy!`;
    if (days / 365 > 1 && days / 365 < 5 && days % 365 === 0) return `${Math.floor(days / 365)} lata!`;
    if (days / 365 > 4 && days % 365 === 0) return `${Math.floor(days / 365)} lat!`;
    return "";
  };

  const milestone = getMilestoneMessage(days);

  const handleSave = () => {
    onEdit({
      ...streak,
      name: editedName,
      start_date: editedDate,
      icon: editedIcon,
      color: editedColor,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(streak.name);
    setEditedDate(streak.start_date);
    setEditedIcon(streak.icon || "flame");
    setEditedColor(streak.color || "zinc");
    setIsEditing(false);
    setShowIconPicker(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedName(streak.name);
    setEditedDate(streak.start_date);
    setEditedIcon(streak.icon || "flame");
    setEditedColor(streak.color || "zinc");
  };

  return (
    <div className={`${colors.bg} rounded-xl shadow-lg p-4 transition-all hover:shadow-xl`}>
      {/* Header z ikoną i nazwą */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          {/* Ikona - klikalna w trybie edycji */}
          <div 
            className={`${colors.text} bg-white rounded-full p-2 ${isEditing && 'cursor-pointer'} relative`}
            onClick={() => isEditing && setShowIconPicker(!showIconPicker)}
          >
            <Icon className="w-6 h-6" />
            
            {/* Icon Picker */}
            {showIconPicker && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded shadow p-1 z-10 w-[200px] grid grid-cols-5 gap-2">
                {ICONS.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditedIcon(item.name);
                        setShowIconPicker(false);
                      }}
                      className={`p-2 rounded-lg transition flex justify-center items-center ${
                        editedIcon === item.name
                          ? 'bg-primary text-white'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="streak-name">
                  Nazwa:
                </label>
                <input
                  id="streak-name"
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="np. Nie piję alkoholu"
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="start-date">
                  Data rozpoczęcia:
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={editedDate}
                  onChange={(e) => setEditedDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>


              {/* Wybór koloru */}
              <div>
                <label className="block text-sm font-medium mb-2">Kolor:</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS_EDIT.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setEditedColor(item.name)}
                      className={`w-8 h-8 rounded-full transition-all ${item.class} ${
                        editedColor === item.name
                          ? "border-primary ring-2 ring-primary"
                          : "border-white hover:border-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
                    >
                      <span className="text-sm">Zapisz</span>
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      <span className="text-sm">Anuluj</span>
                      <X className="w-4 h-4" />
                    </button>
              </div> 
              </div>
            ) : (
              <>
                <h3 className="font-semibold text-lg text-gray-800">{streak.name}</h3>
                <p className="text-xs text-gray-500">
                  od {parseISO(streak.start_date).toLocaleDateString("pl-PL")}
                </p>
              </>
            )}
          </div>
        </div>
        
        {/* Przyciski akcji */}
        <div className="flex gap-2">
          {!isEditing && (
            <>
                <button
                  onClick={handleEdit}
                  className="flex flex-col items-center text-primary hover:text-secondary transition-colors"
                  title="Edytuj"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="text-[10px] mt-1">Edytuj</span>
                </button>

                <button
                  onClick={() => onDelete(streak.id)}
                  className="flex flex-col items-center text-red-500 hover:text-red-600 transition-colors"
                  title="Usuń"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-[10px] mt-1">Usuń</span>
                </button>
            </>
          )}
        </div>
      </div>

      {!isEditing && (
      <div className="text-center py-2">
        <div className={`text-4xl font-bold ${colors.text} mb-2`}>
          {days}
        </div>
        <div className="text-gray-600 font-medium">
          {days === 0 ? "dni" : days === 1 ? "dzień" : "dni"}
        </div>
      </div>
      )}

      {/* Milestone message */}
      {milestone && !isEditing && (
        <div className="mt-2 text-center">
          <div className={`inline-block ${colors.text} bg-white px-4 py-2 rounded-full text-sm font-medium`}>
            {milestone}
          </div>
        </div>
      )}

      {!isEditing && (
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div className="bg-white/80 rounded p-1">
          <div className="text-xs text-gray-500">Tygodnie</div>
          <div className={`font-bold ${colors.text}`}>{Math.floor(days / 7)}</div>
        </div>
        <div className="bg-white/80 rounded p-1">
          <div className="text-xs text-gray-500">Miesiące</div>
          <div className={`font-bold ${colors.text}`}>{Math.floor(days / 30)}</div>
        </div>
        <div className="bg-white/80 rounded p-1">
          <div className="text-xs text-gray-500">Lata</div>
          <div className={`font-bold ${colors.text}`}>
            {days >= 365 ? Math.floor(days / 365) : "0"}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}