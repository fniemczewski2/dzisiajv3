// components/ui/buttons/addSpecificButton.tsx

import React from "react";
import { Plus, type LucideIcon } from "lucide-react";
import type { NextRouter } from "next/router";

interface AddSpecificButtonProps {
  path?: string;
  action?: () => void;
  Icon: LucideIcon;
  label: string;
  title?: string;
  router?: NextRouter;
  small?: boolean;
  disabled?: boolean;
}

export const AddSpecificButton = ({
  path,
  Icon,
  title,
  label,
  action,
  router,
  small,
  disabled = false,
}: Readonly<AddSpecificButtonProps>) => {
  return (
    <button
      key={path}
      onClick={() => {
        if (path && router) {
          void router.push(path);
        }
        if (action) {
          action();
        }
      }}
      type="button"
      disabled={disabled}
      title={title}
      className={`group relative flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-line bg-surface p-1.5 text-primary shadow-sm transition-all hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 sm:gap-1.5 sm:p-2 ${small && "w-10"}`}
      aria-label={`dodaj ${label}`}
    >
      <div className="relative top-0 h-5 w-5 sm:h-6 sm:w-6">
        <Icon className="h-5 w-5 transition-transform group-hover:scale-110 sm:h-6 sm:w-6" />
        <Plus className="absolute top-2 left-3 h-3.5 w-3.5 rounded-full bg-surface sm:top-3 sm:h-4 sm:w-4" />
      </div>
      {!small && (
        <span className="text-center text-xs leading-tight font-bold opacity-90 group-hover:opacity-100">{label}</span>
      )}
    </button>
  );
};
