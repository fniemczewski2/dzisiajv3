// components/tasks/TimeContextBadge.tsx
import { getTimeContext, shouldShowUrgentAnimation } from '../../lib/timeContext';
import { Clock } from 'lucide-react';

interface TimeContextBadgeProps {
  dueDate: string;
  className?: string;
  showIcon?: boolean;
}

export default function TimeContextBadge({ 
  dueDate, 
  className = '', 
  showIcon = true 
}: TimeContextBadgeProps) {
  const context = getTimeContext(dueDate);
  const showAnimation = shouldShowUrgentAnimation(dueDate);

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-sm font-medium
        ${context.color}
        ${showAnimation ? 'animate-pulse' : ''}
        ${className}
      `}
    >
      {showIcon && (
        <span className="text-base" role="img" aria-label="status">
          {context.icon}
        </span>
      )}
      <span>{context.display}</span>
      {showAnimation && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
        </span>
      )}
    </div>
  );
}

/**
 * Compact version for list views
 */
export function TimeContextBadgeCompact({ dueDate }: { dueDate: string }) {
  const context = getTimeContext(dueDate);
  const showAnimation = shouldShowUrgentAnimation(dueDate);

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
        ${context.color}
        ${showAnimation ? 'animate-pulse' : ''}
      `}
    >
      <span role="img" aria-label="status">{context.icon}</span>
      <span className="hidden sm:inline">{context.display}</span>
    </span>
  );
}