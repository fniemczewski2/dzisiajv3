import React, { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import Link from 'next/link';

interface MilestonesListProps {
  streaks: any[];
  getMilestoneMessage: (date: string) => string;
}

export const MilestonesList = React.memo(({ streaks, getMilestoneMessage }: MilestonesListProps) => {
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
    <section className="bg-card border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm animate-in fade-in zoom-in duration-300">
      <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
        <Trophy className="text-accent w-5 h-5" /> Postępy
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {streaksWithMilestones.map((streak) => (
          <div key={streak.id} className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-card border">
            <div className="flex flex-col sm:flex-row min-w-0">
              <p className="font-bold text-sm sm:text-base text-text leading-tight truncate">
                {streak.name}
              </p>
              <span className="mt-2 sm:mx-2 sm:mt-0 text-accent bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 px-2 py-1 rounded-md text-xs font-medium tracking-wider h-[24px]">
                {streak.milestoneMessage}
              </span>
            </div>
            <Link 
              href="/streaks" 
              title="Zobacz wszystkie postępy" 
              className="flex items-center justify-center w-[30px] h-[30px] rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 text-textSecondary hover:text-primary transition-colors border bg-surface"
            >
              <Trophy className="w-4 h-4" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
});
MilestonesList.displayName = 'MilestonesList';