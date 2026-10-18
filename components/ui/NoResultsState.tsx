// components/ui/NoResultsState.tsx

import type { ReactNode } from "react";
import { Inbox, SearchX } from "lucide-react";

interface NoResultsStateProps {
  fullScreen?: boolean;
  text: string;
  isSearch?: boolean;
  hint?: string;
  action?: ReactNode;
}

export default function NoResultsState({
  fullScreen = false,
  text,
  isSearch = false,
  hint,
  action,
}: Readonly<NoResultsStateProps>) {
  const Icon = isSearch ? SearchX : Inbox;
  const description = hint ?? (isSearch ? "Zmień frazę lub wyczyść filtry, aby zobaczyć więcej." : undefined);

  const content = (
    <output className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line-strong bg-surface/60 px-6 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-text-muted shadow-sm">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <div className="space-y-1">
        <p className="text-base font-semibold text-text">
          Brak {text} {isSearch ? "spełniających kryteria" : "do wyświetlenia"}
        </p>
        {description && <p className="max-w-sm text-sm text-text-muted">{description}</p>}
      </div>
      {action}
    </output>
  );

  if (fullScreen) {
    return <div className="flex min-h-[60vh] items-center justify-center">{content}</div>;
  }

  return content;
}
