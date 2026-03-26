import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  text: string;
  isSearch?: boolean;
}

export default function NoResultsState({ fullScreen = false, size = 'md', text, isSearch = false }: LoadingStateProps) {
  const content = (
    <div className="text-center py-10 w-md h-md rounded-lg bg-surface" >
        <h3 className="text-md font-medium text-text">Brak {text} {isSearch ? "spełniających kryteria." : "do wyświetlenia."}</h3>
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