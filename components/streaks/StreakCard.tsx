"use client";

import React, { useState } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { 
  Flame, Trophy, Target, Heart, Cigarette, Beer,
  UtensilsCrossed, Dumbbell, Edit2, Trash2, PiggyBank,
  BriefcaseMedical,
} from "lucide-react";
import { Streak } from "../../types";
import { SaveButton, CancelButton, DeleteButton, EditButton } from "../CommonButtons";

interface StreakCardProps {
  streak: Streak;
  onEdit: (s: Streak) => void;
  onDelete: (id: string) => void;
  getMilestoneMessage: (startDate: string | Date, currentDate?: string | Date) => string;
}

const ICON_MAP: { [key: string]: React.ComponentType<any> } = {
  flame: Flame, trophy: Trophy, target: Target, heart: Heart,
  cigarette: Cigarette, beer: Beer, utensils: UtensilsCrossed,
  dumbbell: Dumbbell, piggybank: PiggyBank, medical: BriefcaseMedical,
};

const ICONS = [
  { name: "flame", icon: Flame }, { name: "trophy", icon: Trophy },
  { name: "target", icon: Target}, { name: "heart", icon: Heart },
  { name: "cigarette", icon: Cigarette }, { name: "beer", icon: Beer },
  { name: "utensils", icon: UtensilsCrossed}, { name: "dumbbell", icon: Dumbbell },
  { name: "piggybank", icon: PiggyBank }, { name: "medical", icon: BriefcaseMedical }, 
];

export default function StreakCard({ streak, onEdit, onDelete, getMilestoneMessage }: StreakCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(streak.name);
  const [editedDate, setEditedDate] = useState(streak.start_date);
  const [editedIcon, setEditedIcon] = useState(streak.icon || "flame");
  const [showIconPicker, setShowIconPicker] = useState(false);

  const days = differenceInDays(new Date(), parseISO(streak.start_date));
  const Icon = ICON_MAP[isEditing ? editedIcon : (streak.icon || "flame")];

  const milestone = getMilestoneMessage(streak.start_date);

  const handleSave = () => {
    onEdit({
      ...streak,
      name: editedName,
      start_date: editedDate,
      icon: editedIcon,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(streak.name);
    setEditedDate(streak.start_date);
    setEditedIcon(streak.icon || "flame");
    setIsEditing(false);
    setShowIconPicker(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedName(streak.name);
    setEditedDate(streak.start_date);
    setEditedIcon(streak.icon || "flame");
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 transition-all hover:shadow-md flex flex-col h-full">
      {/* Header z ikoną i nazwą */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1 relative">
          
          {/* Ikona - klikalna w trybie edycji */}
          <div 
            className={`flex-shrink-0 text-primary rounded-xl p-3 ${isEditing ? 'cursor-pointer hover:bg-blue-100 hover:dark:bg-blue-900/70 hover:scale-105' : ''} transition-transform`}
            onClick={() => isEditing && setShowIconPicker(!showIconPicker)}
            title={isEditing ? "Kliknij, aby zmienić ikonę" : undefined}
          >
            <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>

          {/* Icon Picker (Pokazuje się pod ikoną) */}
          {showIconPicker && (
            <div className="absolute top-[3.5rem] left-0 mt-2 bg-card border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-2 z-50 w-[220px] grid grid-cols-5 gap-2">
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
                    className={`p-2 rounded-lg transition-colors flex justify-center items-center ${
                      editedIcon === item.name
                        ? 'bg-primary text-white shadow-sm'
                        : 'hover:bg-surface text-textSecondary hover:text-text'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex-1 min-w-0 pt-1">
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="form-label" htmlFor="streak-name">
                    Nazwa nawyku:
                  </label>
                  <input
                    id="streak-name"
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="np. Biegam rano"
                    className="input-field py-1.5"
                    required
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="start-date">
                    Data rozpoczęcia:
                  </label>
                  <input
                    id="start-date"
                    type="date w-full min-w-0 px-1 text-xs"
                    value={editedDate}
                    onChange={(e) => setEditedDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="input-field py-1.5"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <SaveButton onClick={handleSave} type="button" />
                  <CancelButton onCancel={handleCancel} />
                </div> 
              </div>
            ) : (
              <>
                <h3 className="font-bold text-lg text-text leading-tight break-words">{streak.name}</h3>
                <p className="text-xs font-semibold text-textMuted mt-1 uppercase tracking-widest">
                  Od: {parseISO(streak.start_date).toLocaleDateString("pl-PL")}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Zawsze na dole */}
      <div className="mt-auto">
        {!isEditing && (
          <div className="text-center py-4 bg-surface rounded-xl border border-gray-100 dark:border-gray-800/50 mb-3">
            <div className="text-5xl font-bold text-prmiary tracking-tighter drop-shadow-sm">
              {days}
            </div>
            <div className="text-[11px] font-medium uppercase tracking-widest text-textSecondary mt-1">
              {days === 0 ? "dni" : days === 1 ? "dzień" : "dni"} z rzędu
            </div>
          </div>
        )}

        {/* Milestone message */}
        {milestone && !isEditing && (
          <div className="mb-3 text-center">
            <div className="inline-block text-accent bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
              {milestone}
            </div>
          </div>
        )}

        {!isEditing && (
          <div className="grid grid-cols-3 gap-2 text-center mb-3">
            <div className="bg-surface rounded-lg py-2 border border-gray-100 dark:border-gray-800/50">
              <div className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-0.5">Tygodnie</div>
              <div className="font-bold text-text">{Math.floor(days / 7)}</div>
            </div>
            <div className="bg-surface rounded-lg py-2 border border-gray-100 dark:border-gray-800/50">
              <div className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-0.5">Miesiące</div>
              <div className="font-bold text-text">{Math.floor(days / 30)}</div>
            </div>
            <div className="bg-surface rounded-lg py-2 border border-gray-100 dark:border-gray-800/50">
              <div className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-0.5">Lata</div>
              <div className="font-bold text-text">
                {days >= 365 ? Math.floor(days / 365) : "0"}
              </div>
            </div>
          </div>
        )}

        {/* Przyciski Akcji */}
        {!isEditing && (
          <div className="flex gap-1.5 pt-3 border-t border-gray-100 dark:border-gray-800">
            <EditButton onClick={handleEdit} />
            <DeleteButton onClick={() => onDelete(streak.id)} />
          </div>
        )}
      </div>
    </div>
  );
}