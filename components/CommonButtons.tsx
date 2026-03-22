import React from "react";
import { 
  PlusCircleIcon, 
  Trash2, 
  Edit2, 
  ChevronsRight, 
  Timer,
  Save, 
  Share,
  Check,
  Archive,
  Pin,
  Eye,
  Download,
  X
} from "lucide-react";

interface ButtonProps {
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  small?: boolean;
}

interface FormButtonsProps {
  onClickSave?: () => void;
  onClickClose?: () => void;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
}

export const AddButton = ({ onClick, loading, disabled, type = "submit", small = false }: ButtonProps) => (
  <button
    type={type}
    onClick={onClick}
    disabled={loading || disabled}
    className="px-4 py-2 bg-primary hover:bg-secondary text-white font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    Dodaj
    <PlusCircleIcon className="w-5 h-5" />
  </button>
);

export const CloseButton = ({ onClick, loading, disabled, small = false }: ButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading || disabled}
    className={`${small ? "w-min h-min my-auto p-1.5 sm:p-2" : "px-4 py-2"} w-full md:flex-1 bg-surface hover:bg-surfaceHover text-textSecondary font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-800 shadow`}
  >
    {!small && "Zamknij"}
    <X className={`${small ? "w-4 h-4" : "w-5 h-5"}`} />
  </button>
);

export const SaveButton = ({ onClick, loading, disabled, type = "submit", small = false }: ButtonProps) => (
  <button
    type={type}
    onClick={onClick}
    disabled={loading || disabled}
    className={`${small ? "w-min h-min my-auto p-1.5 sm:p-2" : "px-4 py-2"} w-full md:flex-1 bg-primary hover:bg-secondary text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-transparent shadow`}
  >
    {!small && "Zapisz"}
    <Save className={`${small ? "w-4 h-4" : "w-5 h-5"}`} />
  </button>
);

export const CancelButton = ({ onClick, loading, disabled, small = false }: ButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading || disabled}
    className={`${small ? "w-min h-min my-auto p-1.5 sm:p-2" : "px-4 py-2"} w-full md:flex-1 bg-surface hover:bg-surfaceHover text-textSecondary font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-800`}
  >
    {!small && "Anuluj"}
    <X className={`${small ? "w-4 h-4" : "w-5 h-5"}`} />
  </button>
);

export const FormButtons = ({ onClickSave, onClickClose, loading, disabled, small = false }: FormButtonsProps) => (
  <div className={`${small ? "" : "pt-4 border-t border-gray-100 dark:border-gray-800 flex-col md:flex-row"}, flex items-center md:justify-end gap-2 `}>
    <SaveButton
      onClick={onClickSave}
      disabled={loading || disabled}
      small={small}
    />
    <CloseButton
      onClick={onClickClose}
      disabled={loading || disabled}
      small={small}
    />
  </div>
);

export const DeleteButton = ({ onClick, small = false }: { onClick: () => void; small?: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    className={`${small ? "w-min h-min my-auto" : "flex-1"} flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-surface hover:bg-red-50 dark:hover:bg-red-900/20 text-textMuted hover:text-red-600 dark:hover:text-red-400 border border-transparent hover:border-red-600 dark:hover:border-red-400 transition-colors`}
    aria-label="Usuń"
  >
    <Trash2 className={`${small ? "w-4 h-4" : "w-4 h-4 sm:w-5 sm:h-5 mb-1"}`} />
    {!small && <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide">Usuń</span>}
  </button>
);

export const EditButton = ({ onClick, small = false }: { onClick: () => void; small?: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    className={`${small ? "w-min h-min my-auto" : "flex-1"} flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-surface hover:bg-blue-50 dark:hover:bg-blue-900/20 text-textMuted hover:text-blue-600 dark:hover:text-blue-400 border border-transparent hover:border-blue-600 dark:hover:border-blue-400 transition-colors`}
    aria-label="Edytuj"
  >
    <Edit2 className={`${small ? "w-4 h-4" : "w-4 h-4 sm:w-5 sm:h-5 mb-1"}`} />
    {!small && <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide">Edytuj</span>}
  </button>
);

export const RescheduleButton = ({ onClick, loading }: { onClick: () => void; loading?: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    disabled={loading}
    className="flex-1 flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-surface hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-textMuted hover:text-yellow-600 dark:hover:text-yellow-500 border border-transparent hover:border-yellow-600 dark:hover:border-yellow-500 transition-colors disabled:opacity-50"
    aria-label="Przesuń na jutro"
    title="Przesuń na jutro"
  >
    <ChevronsRight className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
    <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide">
      {loading ? '...' : 'Odłóż'}
    </span>
  </button>
);

export const TimerButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    type="button"
    className="flex-1 flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-surface hover:bg-purple-50 dark:hover:bg-purple-900/20 text-textMuted hover:text-purple-600 dark:hover:text-purple-400 border border-transparent hover:border-purple-600 dark:hover:border-purple-400 transition-colors"
    aria-label="Uruchom timer"
    title="Start Pomodoro"
  >
    <Timer className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
    <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide">Timer</span>
  </button>
);

export const ShareButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    type="button"
    className="flex-1 flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-surface hover:bg-blue-50 dark:hover:bg-blue-900/20 text-textMuted hover:text-blue-600 dark:hover:text-blue-400 border border-transparent hover:border-blue-600 dark:hover:border-blue-400 transition-colors"
    aria-label="Udostępnij"
    title="Udostępnij"
  >
    <Share className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
    <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide">Wyślij</span>
  </button>
);

export const PinButton = ({ onClick, isPinned }: { onClick: () => void; isPinned: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    className="flex-1 flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-surface hover:bg-blue-50 dark:hover:bg-blue-900/20 text-textMuted hover:text-blue-600 dark:hover:text-blue-400 border border-transparent hover:border-blue-600 dark:hover:border-blue-400 transition-colors"
    title={isPinned ? "Odepnij" : "Przypnij"}
  >
    <Pin className={`w-4 h-4 sm:w-5 sm:h-5 mb-1 ${isPinned ? "fill-primary" : ""}`} />
    <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide">
      {isPinned ? "Odepnij" : "Przypnij"}
    </span>
  </button>
);

export const ArchiveButton = ({ onClick, isArchived }: { onClick: () => void; isArchived: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    className="flex-1 flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-surface hover:bg-purple-50 dark:hover:bg-purple-900/20 text-textMuted hover:text-purple-600 dark:hover:text-purple-400 border border-transparent hover:border-purple-600 dark:hover:border-purple-400 transition-colors"
    title={isArchived ? "Przywróć z archiwum" : "Zarchiwizuj"}
  >
    <Archive className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
    <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide">
      {isArchived ? "Pokaż" : "Ukryj"}
    </span>
  </button>
);

export const WatchButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    type="button"
    className="flex-1 flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors border border-green-200 dark:border-green-500/30"
    title="Obejrzane"
  >
    <Check className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
    <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide">Obejrzane</span>
  </button>
);

export const UnwatchButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    type="button"
    className="flex-1 flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-surface hover:bg-blue-50 dark:hover:bg-blue-900/20 text-textMuted hover:text-blue-600 dark:hover:text-blue-400 border border-transparent hover:border-blue-600 dark:hover:border-blue-400 transition-colors"
    title="Do obejrzenia"
  >
    <Eye className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
    <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide">Obejrzyj</span>
  </button>
);

export const PdfButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    type="button"
    className="flex-1 flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-surface hover:bg-purple-50 dark:hover:bg-purple-900/20 text-textMuted hover:text-purple-600 dark:hover:text-purple-400 border border-transparent hover:border-purple-600 dark:hover:border-purple-400 transition-colors"
    aria-label="Generuj PDF"
    title="Generuj PDF"
  >
    <Download className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
    <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide">PDF</span>
  </button>
);
