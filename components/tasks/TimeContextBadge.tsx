// components/tasks/TimeContextBadge.tsx
import { getTimeContext } from '../../lib/timeContext';

interface TimeContextBadgeProps {
  dueDate: string;
  isDone?: boolean;
  className?: string;
  showIcon?: boolean;
}

export default function TimeContextBadge({ 
  dueDate,
  isDone = false,
  className = '', 
  showIcon = true 
}: TimeContextBadgeProps) {
  const context = getTimeContext(dueDate, isDone);
  const Icon = context.icon;
  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-sm font-medium
        ${context.color}
        ${context.shouldPulse ? 'animate-pulse' : ''}
        ${className}
      `}
    >
      {showIcon && (
        <span className="text-base" role="img" aria-label="status">
          <Icon />
        </span>
      )}
      <span>{context.display}</span>
      {context.shouldPulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
        </span>
      )}
    </div>
  );
}