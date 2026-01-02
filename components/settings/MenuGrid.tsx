// components/NavigationGrid.tsx
import React from "react";
import { useRouter } from "next/router";
import { NAVIGATION_CONFIG } from "../../config/navigation";

export default function MenuGrid() {
  const router = useRouter();

  return (
    <>
      {NAVIGATION_CONFIG.map((row, rowIndex) => (
        <div 
          key={rowIndex} 
          className="flex flex-wrap justify-around mb-2 md:mb-4 gap-2 md:gap-4"
        >
          {row.map((button) => {
            const IconComponent = button.icon;
            return (
              <button
                key={button.path}
                onClick={() => router.push(button.path)}
                title={button.title}
                className="flex-1 px-1 py-2 md:p-2 justify-center bg-gray-100 rounded-lg hover:bg-gray-200 flex flex-col items-center transition-colors"
              >
                <IconComponent className="w-5 h-5" />
                <span className="text-[10px] sm:text-[11px]">
                  {button.label}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </>
  );
}