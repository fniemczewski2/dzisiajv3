// components/buttons/CommonButtons.tsx
import React from "react";
import { 
  PlusCircleIcon, 
  Trash2, 
  Edit2, 
  ChevronsRight, 
  Timer,
  Save, 
  Share
} from "lucide-react";

interface ButtonProps {
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

export const AddButton = ({ onClick, loading, type = "submit" }: ButtonProps & { onClick?: () => void }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={loading}
    className="px-3 py-1 bg-primary hover:bg-secondary text-white rounded-lg flex flex-nowrap items-center transition disabled:opacity-50 disabled:cursor-not-allowed"
  >
    Dodaj&nbsp;
    <PlusCircleIcon className="w-5 h-5" />
  </button>
);

export const SaveButton = ({ onClick, loading, type = "submit" }: ButtonProps & { onClick?: () => void }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={loading}
    className="px-3 py-1 bg-primary hover:bg-secondary text-white rounded-lg flex flex-nowrap items-center transition disabled:opacity-50 disabled:cursor-not-allowed"
  >
    Zapisz&nbsp;
    <Save className="w-5 h-5" />
  </button>
);

export const CancelButton = ({ onCancel, loading }: { onCancel: () => void; loading?: boolean }) => (
  <button
    type="button"
    onClick={onCancel}
    disabled={loading}
    className="px-3 py-1 bg-gray-300 rounded-lg hover:bg-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
  >
    Anuluj
  </button>
);

export const DeleteButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    type="button"
    className="flex flex-col px-1.5 items-center justify-center rounded-lg text-red-500 hover:text-red-600 transition-colors"
    aria-label="Usuń"
  >
    <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
    <span className="text-[9px] sm:text-[11px]">Usuń</span>
  </button>
);

export const EditButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    type="button"
    className="flex flex-col px-1.5 items-center justify-center rounded-lg text-primary hover:text-secondary transition-colors"
    aria-label="Edytuj"
  >
    <Edit2 className="w-5 h-5 sm:w-6 sm:h-6" />
    <span className="text-[9px] sm:text-[11px]">Edytuj</span>
  </button>
);

export const RescheduleButton = ({ onClick, loading }: { onClick: () => void; loading?: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    disabled={loading}
    className="flex flex-col px-1.5 items-center justify-center rounded-lg text-yellow-600 hover:text-yellow-800 transition-colors disabled:opacity-50"
    aria-label="Przesuń na jutro"
    title="Przesuń na jutro"
  >
    <ChevronsRight className="w-5 h-5 sm:w-6 sm:h-6" />
    <span className="text-[9px] sm:text-[11px]">
      {loading ? '...' : 'Odłóż'}
    </span>
  </button>
);

export const TimerButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    type="button"
    className="flex flex-col px-1.5 items-center justify-center rounded-lg text-purple-600 hover:text-purple-800 transition-colors"
    aria-label="Uruchom timer"
    title="Start Pomodoro"
  >
    <Timer className="w-5 h-5 sm:w-6 sm:h-6" />
    <span className="text-[9px] sm:text-[11px]">Timer</span>
  </button>
);

export const ShareButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    type="button"
    className="flex flex-col px-1.5 items-center justify-center rounded-lg text-purple-600 hover:text-purple-800 transition-colors"
    aria-label="Udostępnij"
    title="Udostępnij"
  >
    <Share className="w-5 h-5 sm:w-6 sm:h-6" />
    <span className="text-[9px] sm:text-[11px]">Wyślij</span>
  </button>
);