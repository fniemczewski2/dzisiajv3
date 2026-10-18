// components/dashboard/DayStreaks.tsx

import React from "react";
import { Streak } from "@/types/streaks";

interface DayStreaksProps {
  streaks: (Streak & { milestoneMessage: string })[];
  fetchingStreaks: boolean;
}

export const DayStreaks = React.memo(({ streaks, fetchingStreaks }: Readonly<DayStreaksProps>) => {
  return (
    <>
      {!fetchingStreaks &&
        streaks?.map((streak) => (
          <div
            key={streak.id}
            className="card flex w-full items-center justify-between gap-3 rounded-card p-4 transition-all hover:border-primary"
          >
            <p className="truncate text-sm leading-tight font-bold text-text sm:text-base">{streak.name}</p>
            <span className="h-6 rounded-lg border border-warning-line bg-warning-soft px-2 py-1 text-xs font-medium tracking-wider text-accent">
              {streak.milestoneMessage}
            </span>
          </div>
        ))}
    </>
  );
});
DayStreaks.displayName = "DayStreaks";
