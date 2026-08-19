// components/ui/buttons/actionButtonVariants.ts
// Shared cva variant + sizing helpers behind every small icon+label action
// button (Delete/Edit/Pin/Archive/...) in components/ui/buttons/iconButtons.tsx,
// and reused directly by components/dashboard/PlanItem.tsx.

import { cva } from "class-variance-authority";

export const actionButton = cva(
  "flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      color: {
        blue: "bg-surface hover:bg-blue-50 dark:hover:bg-blue-900/20 text-textMuted hover:text-blue-600 dark:hover:text-blue-400 border-transparent hover:border-blue-600 dark:hover:border-blue-400",
        purple: "bg-surface hover:bg-purple-50 dark:hover:bg-purple-900/20 text-textMuted hover:text-purple-600 dark:hover:text-purple-400 border-transparent hover:border-purple-600 dark:hover:border-purple-400",
        yellow: "bg-surface hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-textMuted hover:text-yellow-600 dark:hover:text-yellow-500 border-transparent hover:border-yellow-600 dark:hover:border-yellow-500",
        red: "bg-surface hover:bg-red-50 dark:hover:bg-red-900/20 text-textMuted hover:text-red-600 dark:hover:text-red-400 border-transparent hover:border-red-600 dark:hover:border-red-400",
        active: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30 border-green-200 dark:border-green-500/30",
      },
      size: {
        default: "flex-1",
        small: "w-min h-min my-auto",
      },
    },
    defaultVariants: { color: "blue", size: "default" },
  }
);

export const actionIcon = (small?: boolean) => (small ? "w-4 h-4" : "w-4 h-4 sm:w-5 sm:h-5 mb-1");
export const ACTION_LABEL_CLASS = "text-[8px] sm:text-[10px] font-bold uppercase tracking-wide";
