import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  text: string;
  isSearch?: boolean;
}

export default function NoResultsState({ fullScreen = false, size = 'md', text, isSearch = false }: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const len = text.length;

  const content = (
    <div className="text-center py-10 w-md h-md rounded-xl bg-gray-100 dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700" >
        <h3 className="text-lg font-medium text-text mb-4">Brak {text}</h3>
        <p className="text-textSecondary">Brak {text} {isSearch ? "spełniających kryteria." : len < 15 && "do wyświetlenia."}</p>
    </div>
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