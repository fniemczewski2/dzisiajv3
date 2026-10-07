// components/ui/LoadingState.tsx

import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  fullScreen?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
}

const SIZE_CLASSES = {
  sm: "w-4 h-4",
  md: "w-7 h-7",
  lg: "w-10 h-10",
} as const;

export default function LoadingState({ fullScreen = false, size = "md", label = "Ładowanie" }: Readonly<LoadingStateProps>) {
  const content = (
    <output aria-live="polite" className="inline-flex flex-col items-center gap-3">
      <Loader2 aria-hidden="true" className={`animate-spin text-primary ${SIZE_CLASSES[size]}`} />
      {fullScreen ? (
        <span className="text-sm font-medium text-text-muted">{label}…</span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </output>
  );

  if (fullScreen) {
    return (
      <div className="h-full min-h-[60vh] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}
