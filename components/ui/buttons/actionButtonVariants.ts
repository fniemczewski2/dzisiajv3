// components/ui/buttons/actionButtonVariants.ts

import { cva } from "class-variance-authority";

export const actionButton = cva(
  "flex flex-col items-center justify-center min-h-11 p-1.5 sm:p-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      color: {
        info: "bg-surface text-text-secondary border-transparent hover:bg-info-soft hover:text-info hover:border-info-line",
        success:
          "bg-surface text-text-secondary border-transparent hover:bg-success-soft hover:text-success hover:border-success-line",
        warning:
          "bg-surface text-text-secondary border-transparent hover:bg-warning-soft hover:text-warning hover:border-warning-line",
        danger:
          "bg-surface text-text-secondary border-transparent hover:bg-danger-soft hover:text-danger hover:border-danger-line",
        active: "bg-success-soft text-success border-success-line hover:bg-success-soft",
      },
      size: {
        default: "flex-1",
        small: "w-min h-min min-h-11 min-w-11 my-auto",
      },
    },
    defaultVariants: { color: "info", size: "default" },
  }
);

export const actionIcon = (small?: boolean) => (small ? "w-4 h-4" : "w-4 h-4 sm:w-5 sm:h-5 mb-1");
export const ACTION_LABEL_CLASS = "text-xs font-semibold";
