// components/ui/buttons/formButtons.tsx

import React from "react";
import { PlusCircleIcon, X, Save, Loader2 } from "lucide-react";

export interface ButtonProps {
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  /** Dostępna nazwa, gdy przycisk dotyczy konkretnego elementu (np. „Dodaj do Zadań: …”). */
  ariaLabel?: string;
}

export const AddButton = ({ onClick, loading, disabled, small = false, ariaLabel }: Readonly<ButtonProps>) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading || disabled}
    className={`${small ? "my-auto min-h-11 min-w-11 p-2" : "min-h-11 px-4 py-2"} flex items-center justify-center gap-2 rounded-lg bg-secondary font-medium text-white transition-colors hover:bg-secondary-hover disabled:cursor-not-allowed disabled:opacity-50`}
    aria-label={ariaLabel ?? "Dodaj"}
  >
    {!small && "Dodaj"}
    <PlusCircleIcon className={`${small ? "h-4 w-4" : "h-5 w-5"}`} aria-hidden="true" />
  </button>
);

const AddAnotherButton = ({ onClick, loading, disabled, small = false }: Readonly<ButtonProps>) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading || disabled}
    className={`${small ? "my-auto min-h-11 min-w-11 p-2" : "min-h-11 px-4 py-2"} flex w-full items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface font-medium text-text-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 md:flex-1`}
    aria-label="Dodaj kolejny"
  >
    Następny
    <PlusCircleIcon className={`${small ? "h-4 w-4" : "h-5 w-5"}`} aria-hidden="true" />
  </button>
);

export const CloseButton = ({ onClick, loading, disabled, small = false }: Readonly<ButtonProps>) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading || disabled}
    className={`${small ? "my-auto min-h-11 min-w-11 p-2" : "min-h-11 px-4 py-2"} flex w-full items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface font-medium text-text-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 md:flex-1`}
    aria-label="Zamknij"
  >
    {!small && "Zamknij"}
    <X className={`${small ? "h-4 w-4" : "h-5 w-5"}`} aria-hidden="true" />
  </button>
);

export const SaveButton = ({ onClick, loading, disabled, small = false, ariaLabel }: Readonly<ButtonProps>) => (
  <button
    type="submit"
    onClick={onClick}
    disabled={loading || disabled}
    className={`dzisiaj-save-btn ${small ? "my-auto min-h-11 min-w-11 p-2" : "min-h-11 px-4 py-2"} flex w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-secondary font-medium text-white transition-colors hover:bg-secondary-hover disabled:cursor-not-allowed disabled:opacity-50 md:flex-1`}
    aria-label={ariaLabel ?? "Zapisz"}
  >
    {!small && "Zapisz"}
    {loading ? (
      <Loader2 className={`${small ? "h-4 w-4" : "h-5 w-5"} animate-spin`} />
    ) : (
      <Save className={`${small ? "h-4 w-4" : "h-5 w-5"}`} aria-hidden="true" />
    )}
  </button>
);

export const CancelButton = ({ onClick, loading, disabled, small = false }: Readonly<ButtonProps>) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading || disabled}
    className={`${small ? "my-auto min-h-11 min-w-11 p-2" : "min-h-11 px-4 py-2"} flex w-full items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface font-medium text-text-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 md:flex-1`}
    aria-label="Anuluj"
  >
    {!small && "Anuluj"}
    <X className={`${small ? "h-4 w-4" : "h-5 w-5"}`} aria-hidden="true" />
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

export const FormButtons = ({
  onClickSave,
  onClickClose,
  loading,
  disabled,
  small = false,
  addMany = false,
  onAddAnother,
}: Readonly<FormButtonsProps>) => (
  <div
    className={`${small ? "" : "flex-col border-t border-line pt-4 md:flex-row"} flex items-center gap-2 md:justify-end`}
  >
    {addMany ? (
      <AddAnotherButton onClick={onAddAnother} disabled={loading || disabled} small={small} />
    ) : (
      <SaveButton onClick={onClickSave} loading={loading} disabled={disabled} small={small} />
    )}
    {/* `disabled` dotyczy tylko zapisu (np. niepoprawny formularz) – zamknięcie
        formularza musi być zawsze możliwe, blokujemy je jedynie w trakcie zapisu. */}
    <CloseButton onClick={onClickClose} loading={loading} small={small} />
  </div>
);
