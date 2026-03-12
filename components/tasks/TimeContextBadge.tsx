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
    <span
      className={`
        inline-flex items-center justify-center rounded-md shadow-sm transition-colors bg-surfaceHover border uppercase
        ${context.color}
        ${context.shouldPulse ? 'animate-pulse' : ''}
        ${small ? 'text-xs px-2 py-1 h-[24px] gap-1 font-medium' : 'text-sm px-3 py-1.5  gap-1.5 font-bold'}
        ${className}
      `}
    >
      {showIcon && (
        <span className="text-base flex items-center justify-center" role="img" aria-label="status">
          <Icon className={`${small ? 'w-3 h-3' : 'w-4 h-4'}`}/>
        </span>
      )}
      <span>{context.display}</span>
      {context.shouldPulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
        </span>
      )}
    </span>
  );
}