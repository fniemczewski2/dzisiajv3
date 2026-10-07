// components/ui/buttons/actionButtonVariants.ts

import { cva } from "class-variance-authority";

export const actionButton = cva(
  "flex flex-col items-center justify-center min-h-11 p-1.5 sm:p-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      color: {
        blue: "bg-surface text-text-secondary border-transparent hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 dark:hover:bg-blue-900/40 dark:hover:text-blue-200 dark:hover:border-blue-500/60",
        purple: "bg-surface text-text-secondary border-transparent hover:bg-green-50 hover:text-green-800 hover:border-green-300 dark:hover:bg-green-900/40 dark:hover:text-green-200 dark:hover:border-green-500/60",
        yellow: "bg-surface text-text-secondary border-transparent hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 dark:hover:bg-amber-900/40 dark:hover:text-amber-200 dark:hover:border-amber-500/60",
        red: "bg-surface text-text-secondary border-transparent hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:hover:bg-red-900/40 dark:hover:text-red-200 dark:hover:border-red-500/60",
        active: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-700/60 dark:hover:bg-green-900/70",
      },
      size: {
        default: "flex-1",
        small: "w-min h-min min-h-9 min-w-9 my-auto",
      },
    },
    defaultVariants: { color: "blue", size: "default" },
  }
);

export const actionIcon = (small?: boolean) => (small ? "w-4 h-4" : "w-4 h-4 sm:w-5 sm:h-5 mb-1");
export const ACTION_LABEL_CLASS = "text-[11px] sm:text-xs font-semibold";
