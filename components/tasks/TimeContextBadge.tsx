// components/tasks/TimeContextBadge.tsx

import { getTimeContext } from "@/lib/timeContext";

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
  className = "",
  showIcon = true,
  small = false,
}: Readonly<TimeContextBadgeProps>) {
  const context = getTimeContext(dueDate, isDone);
  const Icon = context.icon;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg border bg-surface-hover uppercase shadow-sm transition-colors ${context.color} ${context.shouldPulse ? "animate-pulse" : ""} ${small ? "h-6 gap-1 px-2 py-1 text-xs font-medium" : "gap-1.5 px-2 py-1 text-xs font-bold md:px-3 md:py-1.5 md:text-sm"} ${className} `}
    >
      {showIcon && (
        <span className="flex items-center justify-center text-base">
          <Icon aria-hidden="true" className={`${small ? "h-3 w-3" : "h-3.5 w-3.5 md:h-4 md:w-4"}`} />
        </span>
      )}
      <span>{context.display}</span>
      {context.shouldPulse && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current"></span>
        </span>
      )}
    </span>
  );
}
