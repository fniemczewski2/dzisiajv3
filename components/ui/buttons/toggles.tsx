// components/ui/buttons/toggles.tsx

import React from "react";
import type { LucideIcon } from "lucide-react";

export type IconActionVariant = "default" | "primary" | "success" | "warning" | "danger";

export interface IconActionButtonProps {
  onClick: () => void;
  Icon: LucideIcon;
  title: string;
  variant?: IconActionVariant;
  disabled?: boolean;
}

const ICON_ACTION_VARIANTS: Record<IconActionVariant, string> = {
  default: "text-text-muted hover:text-text hover:bg-surface-hover",
  primary: "text-primary hover:bg-primary/10",
  success: "text-success hover:bg-success-solid-hover/10",
  warning: "text-warning hover:bg-warning-solid-hover/10",
  danger: "text-text-muted hover:text-danger hover:bg-danger-soft ",
};

export const IconActionButton = ({
  onClick,
  Icon,
  title,
  variant = "default",
  disabled = false,
}: Readonly<IconActionButtonProps>) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
    className={`inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${ICON_ACTION_VARIANTS[variant]}`}
  >
    <Icon aria-hidden="true" className="h-4 w-4" />
  </button>
);

export interface ToggleChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const ToggleChip = ({ label, active, onClick, disabled = false }: Readonly<ToggleChipProps>) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={active}
    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
      active
        ? "border-transparent bg-secondary text-white shadow-sm"
        : "border-line bg-surface text-text-secondary hover:bg-surface-hover hover:text-text"
    }`}
  >
    {label}
  </button>
);

export interface ToggleSwitchProps {
  id?: string;
  /** Nazwa przełącznika dla czytników ekranu (także gdy obok jest <label htmlFor>). */
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const ToggleSwitch = ({ id, label, checked, onChange, disabled = false }: Readonly<ToggleSwitchProps>) => (
  <button
    id={id}
    aria-label={label}
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
      checked ? "bg-secondary" : "bg-input"
    }`}
  >
    <span
      aria-hidden="true"
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
        checked ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
);
