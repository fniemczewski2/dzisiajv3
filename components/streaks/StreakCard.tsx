// components/streaks/StreakCard.tsx

import { useNow } from "@/hooks/useNow";
import React, { useState } from "react";
import { differenceInDays, parseISO, format } from "date-fns";
import {
  Flame,
  Trophy,
  Target,
  Heart,
  Cigarette,
  Beer,
  UtensilsCrossed,
  Dumbbell,
  PiggyBank,
  BriefcaseMedical,
  type LucideIcon,
} from "lucide-react";
import { Streak } from "@/types/streaks";
import { DeleteButton, EditButton, FormButtons } from "../ui/CommonButtons";

interface StreakCardProps {
  streak: Streak;
  onEdit: (s: Streak) => void;
  onDelete: (id: string) => void;
  getMilestoneMessage: (startDate: string | Date, currentDate?: string | Date) => string;
  loading: boolean;
}

const ICON_MAP: { [key: string]: LucideIcon } = {
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
  { name: "target", icon: Target },
  { name: "heart", icon: Heart },
  { name: "cigarette", icon: Cigarette },
  { name: "beer", icon: Beer },
  { name: "utensils", icon: UtensilsCrossed },
  { name: "dumbbell", icon: Dumbbell },
  { name: "piggybank", icon: PiggyBank },
  { name: "medical", icon: BriefcaseMedical },
];

export default function StreakCard({
  streak,
  onEdit,
  onDelete,
  getMilestoneMessage,
  loading,
}: Readonly<StreakCardProps>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(streak.name);
  const [editedDate, setEditedDate] = useState(streak.start_date);
  const [editedIcon, setEditedIcon] = useState(streak.icon || "flame");
  const [showIconPicker, setShowIconPicker] = useState(false);

  const now = useNow();
  const days = differenceInDays(now, parseISO(streak.start_date));
  const Icon = ICON_MAP[isEditing ? editedIcon : streak.icon || "flame"];

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

  const dayLabel = days === 1 ? "dzień" : "dni";

  return (
    <div className="card flex h-full flex-col p-4 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <div className="relative flex flex-1 items-start gap-3">
          <button
            className={`shrink-0 rounded-xl p-3 text-primary ${isEditing ? "cursor-pointer hover:scale-105 hover:bg-info-soft" : ""} transition-transform`}
            onClick={() => isEditing && setShowIconPicker(!showIconPicker)}
            type="button"
            title={isEditing ? "Kliknij, aby zmienić ikonę" : undefined}
          >
            <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
          </button>

          {showIconPicker && (
            <div className="card absolute top-14 left-0 z-50 mt-2 grid w-55 grid-cols-5 gap-2 p-2 shadow-lg">
              {ICONS.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.name}
                    type="button"
                    aria-label={`Ikona: ${item.name}`}
                    aria-pressed={editedIcon === item.name}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditedIcon(item.name);
                      setShowIconPicker(false);
                    }}
                    className={`flex items-center justify-center rounded-lg p-2 transition-colors ${
                      editedIcon === item.name
                        ? "bg-secondary text-white shadow-sm"
                        : "text-text-secondary hover:bg-surface hover:text-text"
                    }`}
                  >
                    <IconComponent className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          )}

          <div className="min-w-0 flex-1 pt-1">
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
                    max={format(now, "yyyy-MM-dd")}
                    className="input-field py-1.5"
                    required
                  />
                </div>
                <FormButtons onClickSave={handleSave} onClickClose={handleCancel} loading={loading} />
              </div>
            ) : (
              <>
                <h3 className="text-lg leading-tight font-bold wrap-break-word text-text">{streak.name}</h3>
                <p className="mt-1 text-xs font-semibold text-text-muted">
                  Od: {parseISO(streak.start_date).toLocaleDateString("pl-PL")}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto">
        {!isEditing && (
          <div className="mb-3 rounded-xl border border-line bg-surface py-4 text-center">
            <div className="text-5xl font-bold tracking-tighter text-primary drop-shadow-sm">{days}</div>
            <div className="mt-1 text-xs font-medium text-text-secondary">{dayLabel} z rzędu</div>
          </div>
        )}
        {milestone && !isEditing && (
          <div className="mb-3 text-center">
            <div className="inline-block rounded-full border border-warning-line bg-warning-soft px-3 py-1 text-xs font-bold text-warning shadow-sm">
              {milestone}
            </div>
          </div>
        )}

        {!isEditing && (
          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-line bg-surface py-2">
              <div className="mb-0.5 text-xs font-bold text-text-muted">Tygodnie</div>
              <div className="font-bold text-text">{Math.floor(days / 7)}</div>
            </div>
            <div className="rounded-lg border border-line bg-surface py-2">
              <div className="mb-0.5 text-xs font-bold text-text-muted">Miesiące</div>
              <div className="font-bold text-text">{Math.floor(days / 30)}</div>
            </div>
            <div className="rounded-lg border border-line bg-surface py-2">
              <div className="mb-0.5 text-xs font-bold text-text-muted">Lata</div>
              <div className="font-bold text-text">{days >= 365 ? Math.floor(days / 365) : "0"}</div>
            </div>
          </div>
        )}

        {!isEditing && (
          <div className="flex gap-1.5 border-t border-line pt-3">
            <EditButton onClick={handleEdit} />
            <DeleteButton onClick={() => onDelete(streak.id)} />
          </div>
        )}
      </div>
    </div>
  );
}
