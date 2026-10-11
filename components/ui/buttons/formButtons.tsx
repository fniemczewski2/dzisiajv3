// components/ui/buttons/formButtons.tsx

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
    className={`${small ? "min-h-11 min-w-11 my-auto p-2" : "min-h-11 px-4 py-2"} hover:bg-secondary-hover bg-secondary text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
    aria-label="dodaj"
  >
    {!small && "Dodaj"}
    <PlusCircleIcon className={`${small ? "w-4 h-4" : "w-5 h-5"}`} aria-hidden="true" />
  </button>
);

export const AddAnotherButton = ({ onClick, loading, disabled, small = false }: Readonly<ButtonProps>) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading || disabled}
    className={`${small ? "min-h-11 min-w-11 my-auto p-2" : "min-h-11 px-4 py-2"} w-full md:flex-1 bg-surface hover:bg-surface-hover text-text-secondary font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-line-strong`}
    aria-label="dodaj kolejny"
  >
    Następny
    <PlusCircleIcon className={`${small ? "w-4 h-4" : "w-5 h-5"}`} aria-hidden="true" />
  </button>
);

export const CloseButton = ({ onClick, loading, disabled, small = false }: Readonly<ButtonProps>) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading || disabled}
    className={`${small ? "min-h-11 min-w-11 my-auto p-2" : "min-h-11 px-4 py-2"} w-full md:flex-1 bg-surface hover:bg-surface-hover text-text-secondary font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-line-strong`}
    aria-label="zamknij"
  >
    {!small && "Zamknij"}
    <X className={`${small ? "w-4 h-4" : "w-5 h-5"}`} aria-hidden="true" />
  </button>
);

export const SaveButton = ({ onClick, loading, disabled, small = false }: Readonly<ButtonProps>) => (
  <button
    type="submit"
    onClick={onClick}
    disabled={loading || disabled}
    className={`dzisiaj-save-btn ${small ? "min-h-11 min-w-11 my-auto p-2" : "min-h-11 px-4 py-2"} w-full md:flex-1 hover:bg-secondary-hover bg-secondary text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-transparent`}
    aria-label="zapisz"
  >
    {!small && "Zapisz"}
    {loading ? <Loader2 className={`${small ? "w-4 h-4" : "w-5 h-5"} animate-spin`} /> : <Save className={`${small ? "w-4 h-4" : "w-5 h-5"}`} aria-hidden="true" />}
  </button>
);

export const CancelButton = ({ onClick, loading, disabled, small = false }: Readonly<ButtonProps>) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading || disabled}
    className={`${small ? "min-h-11 min-w-11 my-auto p-2" : "min-h-11 px-4 py-2"} w-full md:flex-1 bg-surface hover:bg-surface-hover text-text-secondary font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-line-strong`}
    aria-label="anuluj"
  >
    {!small && "Anuluj"}
    <X className={`${small ? "w-4 h-4" : "w-5 h-5"}`} aria-hidden="true" />
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
    {/* `disabled` dotyczy tylko zapisu (np. niepoprawny formularz) – zamknięcie
        formularza musi być zawsze możliwe, blokujemy je jedynie w trakcie zapisu. */}
    <CloseButton
      onClick={onClickClose}
      loading={loading}
      small={small}
    />
  </div>
);
