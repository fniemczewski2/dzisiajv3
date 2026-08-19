// components/ui/buttons/addSpecificButton.tsx
// Split out of the former CommonButtons.tsx.

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
}

export const AddSpecificButton = ({ path, Icon, title, label, action, router, small }: Readonly<AddSpecificButtonProps>) => {
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
    type='button'
    title={title}
    className={`group relative p-1.5 sm:p-2 bg-surface text-primary hover:bg-surfaceHover rounded-lg border border-gray-200 dark:border-gray-800 transition-all flex flex-1 flex-col items-center justify-center gap-1 sm:gap-1.5 shadow-sm ${small && "w-10"}`}
    aria-label={`dodaj ${label}`}
  >
      <div className="relative top-0 w-5 h-5 sm:h-6 sm:w-6">
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
        <Plus className="absolute left-3 top-2 sm:top-3 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-surface rounded-full"/>
      </div>
    {!small &&
      <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide opacity-90 group-hover:opacity-100 text-center leading-tight">
        {label}
      </span>
    }
  </button>
)};
