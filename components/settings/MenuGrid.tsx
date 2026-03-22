import React from "react";
import { useRouter } from "next/router";
import { NAVIGATION_CATEGORIES, QUICK_ACTIONS } from "../../config/navigation";
import { Plus } from "lucide-react";

export default function MenuGrid() {
  const router = useRouter();

  return (
    <div className="space-y-4 mb-4">
      <div className="card rounded-2xl shadow-sm p-2 sm:p-3">
        <h3 className="text-[10px] sm:text-[11px] pb-2 sm:pb-3 px-2 font-bold text-textMuted uppercase tracking-widest">
          DODAJ
        </h3>
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {QUICK_ACTIONS.map((action) => {
            const IconComponent = action.icon;
            return (
              <button
                key={action.path}
                onClick={() => router.push(action.path)}
                title={action.title}
                className="group relative p-1.5 sm:p-2 bg-surface text-primary hover:bg-secondary rounded-lg border border-gray-200 dark:border-gray-800 transition-all flex flex-col items-center justify-center gap-1 sm:gap-1.5 shadow-sm"
              >
                
                <div className="relative top-0 w-5 h-5 sm:h-6 sm:w-6">
                  <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
                  <Plus className="absolute left-3 top-2 sm:top-3 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-surface rounded-full"/>
                </div>
                <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide opacity-90 group-hover:opacity-100 text-center leading-tight">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {NAVIGATION_CATEGORIES.map((category) => {
        return (
          <div 
            key={category.name}
            className="card rounded-xl p-2 sm:p-3"
          >
            <h3 className="text-[10px] sm:text-[11px] pb-2 sm:pb-3 px-2 font-bold text-textMuted uppercase tracking-widest">
              {category.name}
            </h3>

            <div className="flex flex-nowrap gap-1.5 sm:gap-2">
              {category.items.map((button) => {
                const IconComponent = button.icon;
                const isActive = router.pathname === button.path;
                
                return (
                  <button
                    key={button.path}
                    onClick={() => router.push(button.path)}
                    title={button.title}
                    className={`
                      relative p-1.5 sm:p-2 rounded-lg border transition-all
                      flex flex-col items-center justify-center gap-1 sm:gap-1.5 flex-1 group
                      bg-surface border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-surfaceHover text-textSecondary'
                    `}
                  >
                    <IconComponent className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-primary' : 'text-textMuted group-hover:text-text'
                    }`} />
                    <span className={`text-[8px] sm:text-[10px] text-center leading-tight font-bold tracking-wide uppercase ${
                      isActive ? 'text-primary' : 'text-textSecondary group-hover:text-text'
                    }`}>
                      {button.label}
                    </span>
                    {button.badge && (
                      <span className="absolute -top-1.5 -right-0.5 sm:-right-1.5 px-1.5 py-0.5 bg-red-500 dark:bg-red-600 text-white text-[8px] rounded-full shadow-sm border-2 border-card z-10">
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