import React, { useMemo } from 'react';

interface DayStreaksProps {
  streaks: any[];
  getMilestoneMessage: (date: string) => string;
}

export const DayStreaks = React.memo(({ streaks, getMilestoneMessage }: DayStreaksProps) => {
  const streaksWithMilestones = useMemo(() => {
    if (!streaks) return [];
    return streaks
      .map(streak => ({
        ...streak,
        milestoneMessage: getMilestoneMessage(streak.start_date)
      }))
      .filter(streak => streak.milestoneMessage !== "");
  }, [streaks, getMilestoneMessage]);

  if (streaksWithMilestones.length === 0) return null;

  return (
    <>
        {streaksWithMilestones.map((streak) => (
          <div key={streak.id} className="p-4 w-full card hover:border-primary transition-all flex items-center justify-between gap-3 rounded-2xl">
              <p className="font-bold text-sm sm:text-base text-text leading-tight truncate">
                {streak.name}
              </p>
              <span className="text-accent bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 px-2 py-1 rounded-md text-xs font-medium tracking-wider h-[24px]">
                {streak.milestoneMessage}
              </span>
          </div>
        ))}
      </>
  );
});
DayStreaks.displayName = 'DayStreaks';