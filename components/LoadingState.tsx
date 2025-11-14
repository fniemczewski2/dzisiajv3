import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingState({ fullScreen = false, size = 'md' }: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const content = (
    <Loader2 className={`animate-spin text-primary ${sizeClasses[size]}`} />
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}