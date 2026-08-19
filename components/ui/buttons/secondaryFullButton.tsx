// components/ui/buttons/secondaryFullButton.tsx
// Split out of the former CommonButtons.tsx.

import React from "react";
import { cva } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const secondaryFullButton = cva(
  "font-semibold px-4 py-2 w-full flex flex-1 justify-center items-center gap-2 rounded-lg border transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        default: "bg-surface hover:bg-surfaceHover text-textSecondary border-gray-200 dark:border-gray-800",
        danger: "bg-surface hover:bg-surfaceHover text-red-600 dark:text-red-400 border-gray-200 dark:border-gray-800",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

interface SecondaryFullButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  ariaBusy?: boolean;
  variant?: "default" | "danger";
  Icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

// Shared full-width "secondary" button (Wyloguj się / Usuń konto / Połącz ze
// Slackiem / Odłącz lokalizację, ...) — previously each caller hand-copied
// the same ~20-class string, so a style tweak needed to be repeated in 4+
// files. `className` is merged with `cn()` (clsx + tailwind-merge) so a
// caller-supplied override (e.g. `mt-4`) actually takes effect.
export const SecondaryFullButton = ({
  onClick,
  disabled = false,
  ariaBusy,
  variant = "default",
  Icon,
  children,
  className,
}: Readonly<SecondaryFullButtonProps>) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-busy={ariaBusy}
    className={cn(secondaryFullButton({ variant }), className)}
  >
    <span>{children}</span>
    <Icon className="w-5 h-5" aria-hidden="true" />
  </button>
);
