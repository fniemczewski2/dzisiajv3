// components/ui/buttons/toggles.tsx
// Split out of the former CommonButtons.tsx: standalone icon buttons and
// toggle controls (not part of the actionButton family).

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
  success: "text-green-700 dark:text-green-300 hover:bg-green-600/10",
  warning: "text-amber-700 dark:text-amber-300 hover:bg-amber-600/10",
  danger: "text-text-muted hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30",
};

export const IconActionButton = ({ onClick, Icon, title, variant = "default", disabled = false }: Readonly<IconActionButtonProps>) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
    className={`inline-flex items-center justify-center min-w-9 min-h-9 p-2 rounded-lg transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${ICON_ACTION_VARIANTS[variant]}`}
  >
    <Icon aria-hidden="true" className="w-4 h-4" />
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
    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border disabled:opacity-50 disabled:cursor-not-allowed ${
      active
        ? "bg-secondary text-white border-transparent shadow-sm"
        : "bg-surface text-text-secondary hover:text-text hover:bg-surface-hover border-line"
    }`}
  >
    {label}
  </button>
);

export interface ToggleSwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const ToggleSwitch = ({ id, checked, onChange, disabled = false }: Readonly<ToggleSwitchProps>) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
      checked ? "bg-secondary" : "bg-gray-400 dark:bg-gray-600"
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
