// components/tasks/TimeContextBadge.tsx
import { getTimeContext } from '../../lib/timeContext';

interface TimeContextBadgeProps {
  dueDate: string;
  isDone?: boolean;
  className?: string;
  showIcon?: boolean;
  small?: boolean;
}

export default function TimeContextBadge({ 
  dueDate,
  isDone = false,
  className = '', 
  showIcon = true ,
  small = false,
}: TimeContextBadgeProps) {
  const context = getTimeContext(dueDate, isDone);
  const Icon = context.icon;
  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-lg font-medium
        ${context.color}
        ${context.shouldPulse ? 'animate-pulse' : ''}
        ${small ? 'text-xs px-2 py-1 h-[24px]' : 'text-sm px-3 py-1.5'}
        ${className}
      `}
    >
      {showIcon && (
        <span className="text-base" role="img" aria-label="status">
          <Icon className={`${small ? 'w-3 h-3' : 'w-5 h-5'}`}/>
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