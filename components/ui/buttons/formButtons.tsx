// components/ui/buttons/formButtons.tsx
// Split out of the former CommonButtons.tsx: generic form action buttons
// (Dodaj / Zapisz / Anuluj / Zamknij / Następny) and the FormButtons wrapper
// that combines Save+Close or AddAnother+Close depending on context.

import React from "react";
import { PlusCircleIcon, X, Save, Loader2 } from "lucide-react";

export interface ButtonProps {
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
}

export const AddButton = ({ onClick, loading, disabled, small = false }: Readonly<ButtonProps>) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading || disabled}
    className={`${small ? "w-min h-min my-auto p-1.5 sm:p-2" : "px-4 py-2"} hover:bg-primary bg-secondary text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
    aria-label="dodaj"
  >
    {!small && "Dodaj"}
    <PlusCircleIcon className={`${small ? "w-4 h-4" : "w-5 h-5"}`} />
  </button>
);

export const AddAnotherButton = ({ onClick, loading, disabled, small = false }: Readonly<ButtonProps>) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading || disabled}
    className={`${small ? "w-min h-min my-auto p-1.5 sm:p-2" : "px-4 py-2"} w-full md:flex-1 bg-surface hover:bg-surfaceHover text-textSecondary font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-800 shadow`}
    aria-label="dodaj kolejny"
  >
    Następny
    <PlusCircleIcon className={`${small ? "w-4 h-4" : "w-5 h-5"}`} />
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

export interface FormButtonsProps {
  onClickSave?: () => void;
  onClickClose?: () => void;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  addMany?: boolean;
  onAddAnother?: () => void;
}

export const FormButtons = ({ onClickSave, onClickClose, loading, disabled, small = false, addMany = false, onAddAnother }: Readonly<FormButtonsProps>) => (
  <div className={`${small ? "" : "pt-4 border-t border-gray-100 dark:border-gray-800 flex-col md:flex-row"} flex items-center md:justify-end gap-2 `}>
    {addMany ? (
      <AddAnotherButton
        onClick={onAddAnother}
        disabled={loading || disabled}
        small={small}
      />
    ) : (
      <SaveButton
        onClick={onClickSave}
        loading={loading}
        disabled={disabled}
        small={small}
      />
    )}
    <CloseButton
      onClick={onClickClose}
      disabled={disabled}
      small={small}
    />
  </div>
);
