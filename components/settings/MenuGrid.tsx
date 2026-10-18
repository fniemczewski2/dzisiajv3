// components/settings/MenuGrid.tsx

import React from "react";
import { useRouter } from "next/router";
import { NAVIGATION_CATEGORIES, QUICK_ACTIONS } from "@/config/navigation";
import { AddSpecificButton } from "../ui/CommonButtons";
import { useEnabledModules } from "@/hooks/useEnabledModules";

export default function MenuGrid() {
  const router = useRouter();
  const { isEnabled } = useEnabledModules();

  return (
    <div className="mb-4 space-y-4">
      <div className="card rounded-card p-2 shadow-sm sm:p-3">
        <h3 className="px-2 pb-2 text-xs font-bold text-text-muted sm:pb-3">DODAJ</h3>
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {QUICK_ACTIONS.filter((a) => isEnabled(a.path)).map((action) => {
            return (
              <AddSpecificButton
                path={action.path}
                title={action.title}
                Icon={action.icon}
                label={action.label}
                router={router}
                key={action.label}
              />
            );
          })}
        </div>
      </div>
      {NAVIGATION_CATEGORIES.map((c) => ({ ...c, items: c.items.filter((i) => isEnabled(i.path)) }))
        .filter((c) => c.items.length > 0)
        .map((category) => {
          return (
            <div key={category.name} className="card rounded-xl p-2 sm:p-3">
              <h3 className="px-2 pb-2 text-xs font-bold text-text-muted sm:pb-3">{category.name}</h3>

              <div className="flex flex-nowrap gap-1.5 sm:gap-2">
                {category.items.map((button) => {
                  const IconComponent = button.icon;
                  const isActive = router.pathname === button.path;

                  return (
                    <button
                      key={button.path}
                      onClick={() => router.push(button.path)}
                      type="button"
                      title={button.title}
                      className={`group text-text-secondary' relative flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-line bg-surface p-1.5 transition-all hover:border-line-strong hover:bg-surface-hover sm:gap-1.5 sm:p-2`}
                    >
                      <IconComponent
                        className={`h-5 w-5 transition-transform group-hover:scale-110 sm:h-6 sm:w-6 ${
                          isActive ? "text-primary" : "text-text-muted group-hover:text-text"
                        }`}
                      />
                      <span
                        className={`text-center text-xs leading-tight font-bold ${
                          isActive ? "text-primary" : "text-text-secondary group-hover:text-text"
                        }`}
                      >
                        {button.label}
                      </span>
                      {button.badge && (
                        <span className="absolute -top-1.5 -right-0.5 z-10 rounded-full border-2 border-card bg-danger-solid px-1.5 py-0.5 text-xs text-white shadow-sm sm:-right-1.5">
                          {button.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
}
