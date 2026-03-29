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
  X,
  Plus,
  LucideIcon,
  Star,
  Loader2
} from "lucide-react";
import { NextRouter } from "next/router";

interface ButtonProps {
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
}

interface AddSpecificButtonProps {
  path?: string;
  action?: () => void;
  Icon: LucideIcon;
  label: string;
  title?: string;
  router?: NextRouter
}

interface FormButtonsProps {
  onClickSave?: () => void;
  onClickClose?: () => void;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
}

export const AddButton = ({ onClick, loading, disabled, small = false }: Readonly<ButtonProps>) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading || disabled}
    className="px-4 py-2 hover:bg-primary bg-secondary text-white font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    aria-label="dodaj"
  >
    Dodaj
    <PlusCircleIcon className="w-5 h-5" />
  </button>
);

export const CloseButton = ({ onClick, loading, disabled, small = false }: Readonly<ButtonProps>) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading || disabled}
    className={`${small ? "w-min h-min my-auto p-1.5 sm:p-2" : "px-4 py-2"} w-full md:flex-1 bg-surface hover:bg-surfaceHover text-textSecondary font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-800 shadow`}
    aria-label="zamknij"
  >
    {!small && "Zamknij"}
    <X className={`${small ? "w-4 h-4" : "w-5 h-5"}`} />
  </button>
);

export const SaveButton = ({ onClick, loading, disabled, small = false }: Readonly<ButtonProps>) => (
  <button
    type="submit"
    onClick={onClick}
    disabled={loading || disabled}
    className={`dzisiaj-save-btn ${small ? "w-min h-min my-auto p-1.5 sm:p-2" : "px-4 py-2"} w-full md:flex-1 hover:bg-primary bg-secondary text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-transparent shadow`}
    aria-label="zapisz"
  >
    {!small && "Zapisz"}
    {loading ? <Loader2 className={`${small ? "w-4 h-4" : "w-5 h-5"} animate-spin`} /> : <Save className={`${small ? "w-4 h-4" : "w-5 h-5"}`} />}
  </button>
);

export const CancelButton = ({ onClick, loading, disabled, small = false }: Readonly<ButtonProps>) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading || disabled}
    className={`${small ? "w-min h-min my-auto p-1.5 sm:p-2" : "px-4 py-2"} w-full md:flex-1 bg-surface hover:bg-surfaceHover text-textSecondary font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-800`}
    aria-label="anuluj"
  >
    {!small && "Anuluj"}
    <X className={`${small ? "w-4 h-4" : "w-5 h-5"}`} />
  </button>
);

export const FormButtons = ({ onClickSave, onClickClose, loading, disabled, small = false }: Readonly<FormButtonsProps>) => (
  <div className={`${small ? "" : "pt-4 border-t border-gray-100 dark:border-gray-800 flex-col md:flex-row"} flex items-center md:justify-end gap-2 `}>
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
    aria-label="usuń"
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
    aria-label="edytuj"
  >
    <Edit2 className={`${small ? "w-4 h-4" : "w-4 h-4 sm:w-5 sm:h-5 mb-1"}`} />
    {!small && <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide">Edytuj</span>}
  </button>
);

export const FavButton = ({ onClick, small = false }: { onClick: () => void; small?: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    className={`${small ? "w-min h-min my-auto" : "flex-1"} flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-surface hover:bg-blue-50 dark:hover:bg-blue-900/20 text-textMuted hover:text-blue-600 dark:hover:text-blue-400 border border-transparent hover:border-blue-600 dark:hover:border-blue-400 transition-colors`}
    aria-label="dodaj do ulubionych"
    title="Dodaj do ulubionych"
  >
    <Star className={`${small ? "w-4 h-4" : "w-4 h-4 sm:w-5 sm:h-5 mb-1"}`} />
    {!small && <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide">Dodaj</span>}
  </button>
);

export const RescheduleButton = ({ onClick, loading }: { onClick: () => void; loading?: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    disabled={loading}
    className="flex-1 flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-surface hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-textMuted hover:text-yellow-600 dark:hover:text-yellow-500 border border-transparent hover:border-yellow-600 dark:hover:border-yellow-500 transition-colors disabled:opacity-50"
    aria-label="przesuń na jutro"
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
    aria-label="uruchom timer"
    title="Uruchom timer Pomodoro"
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
    aria-label="udostępnij"
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
    aria-label={isPinned ? "Odepnij" : "Przypnij"}
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
    aria-label={isArchived ? "Przywróć z archiwum" : "Zarchiwizuj"}
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
    aria-label="Obejrzane"
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
    aria-label="Do obejrzenia"
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

export const AddSpecificButton = ({ path, Icon, title, label, action, router }: Readonly<AddSpecificButtonProps>) => {
  return (
  <button
    key={path}
    onClick={() => {
        if (path && router) {
          router.push(path);
        }
        if (action) {
          action();
        }
      }}
    title={title}
    className="group relative p-1.5 sm:p-2 bg-surface text-primary hover:bg-surfaceHover rounded-lg border border-gray-200 dark:border-gray-800 transition-all flex flex-1 flex-col items-center justify-center gap-1 sm:gap-1.5 shadow-sm"
    aria-label={`dodaj ${label}`}
  >        
      <div className="relative top-0 w-5 h-5 sm:h-6 sm:w-6">
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
        <Plus className="absolute left-3 top-2 sm:top-3 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-surface rounded-full"/>
      </div>
    <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide opacity-90 group-hover:opacity-100 text-center leading-tight">
      {label}
    </span>
  </button>
)};
