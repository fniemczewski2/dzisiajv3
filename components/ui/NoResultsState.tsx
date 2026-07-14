interface NoResultsStateProps {
  fullScreen?: boolean;
  text: string;
  isSearch?: boolean;
}

export default function NoResultsState({ fullScreen = false, text, isSearch = false }: Readonly<NoResultsStateProps>) {
  const content = (
    <div className="text-center py-10 rounded-lg bg-surface" >
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