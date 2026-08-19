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
  default: "text-textMuted hover:text-text hover:bg-surfaceHover",
  primary: "text-primary hover:bg-blue-100 dark:hover:bg-blue-900/40",
  success: "text-green-600 hover:bg-green-600/10",
  warning: "text-yellow-600 hover:bg-yellow-600/10",
  danger: "text-textMuted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20",
};

export const IconActionButton = ({ onClick, Icon, title, variant = "default", disabled = false }: Readonly<IconActionButtonProps>) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
    className={`p-2 rounded-lg transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${ICON_ACTION_VARIANTS[variant]}`}
  >
    <Icon className="w-4 h-4" />
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
    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border disabled:opacity-50 disabled:cursor-not-allowed ${
      active
        ? "bg-secondary text-white border-primary shadow-sm"
        : "bg-surface text-textSecondary hover:text-text border-gray-200 dark:border-gray-700"
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
      checked ? "bg-secondary" : "bg-gray-300 dark:bg-gray-700"
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
