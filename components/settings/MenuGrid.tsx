// components/settings/MenuGrid.tsx
import React from "react";
import { useRouter } from "next/router";
import { NAVIGATION_CATEGORIES, QUICK_ACTIONS } from "../../config/navigation";

export default function MenuGrid() {
  const router = useRouter();

  return (
    <div className="space-y-4 mb-4">
      {/* Quick Actions - zawsze widoczne na górze */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
        <h3 className="text-sm pb-2 px-2 font-semibold text-gray-700 uppercase tracking-wide">
          SZYBKIE AKCJE
        </h3>
        <div className="grid grid-cols-4 gap-1">
          {QUICK_ACTIONS.map((action) => {
            const IconComponent = action.icon;
            return (
              <button
                key={action.path}
                onClick={() => router.push(action.path)}
                title={action.title}
                className="bg-primary hover:bg-secondary text-white relative p-2 rounded-lg border transition-all flex flex-col items-center gap-1"
              >
                <IconComponent className="w-6 h-6 mb-1" />
                <span className="text-[10px]">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Kategorie nawigacji */}
      {NAVIGATION_CATEGORIES.map((category) => {
        
        return (
          <div 
            key={category.name}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-2"
          >

                <h3 className="text-sm pb-2 px-2 font-semibold text-gray-700 uppercase tracking-wide">
                  {category.name}
                </h3>

                <div className="grid grid-cols-4 gap-2">
                  {category.items.map((button) => {
                    const IconComponent = button.icon;
                    const isActive = router.pathname === button.path;
                    
                    return (
                      <button
                        key={button.path}
                        onClick={() => router.push(button.path)}
                        title={button.title}
                        className="
                          relative p-2 rounded-lg border transition-all
                          flex flex-col items-center gap-1
                        "
                      >
                        <IconComponent className={`w-6 h-6 ${
                          isActive ? 'text-primary' : 'text-gray-700'
                        }`} />
                        <span className={`text-[10px] sm:text-xs text-center leading-tight ${
                          isActive ? 'font-semibold text-primary' : 'text-gray-700'
                        }`}>
                          {button.label}
                        </span>
                        
                        {/* Badge jeśli istnieje */}
                        {button.badge && (
                          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full">
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