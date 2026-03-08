import { Info } from "lucide-react";
import { useVersion } from "../../hooks/useVersion";

export default function VersionInfo() {
  const { version, commitDate, loading, error } = useVersion();

  return (
    <div className="bg-card border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-4 sm:p-6 mb-4 transition-colors">
      <div className="flex items-center gap-3 text-text mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Info className="w-5 h-5 text-primary flex-shrink-0" />
        </div>
        <h3 className="text-lg font-bold">Informacje o wersji</h3>
      </div>

      {loading ? (
        <div className="text-sm font-medium text-textMuted animate-pulse">Pobieranie informacji o wersji...</div>
      ) : error ? (
        <div className="text-sm font-medium text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-900/50">
          Błąd: {error}
        </div>
      ) : (
        <div className="bg-surface border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="font-semibold text-textSecondary">Wersja aplikacji:</span>
            <span className="px-2.5 py-1 font-mono font-bold rounded-md bg-primary/10 text-primary border border-primary/20">
              {version}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-xs sm:text-sm border-t border-gray-200 dark:border-gray-700 pt-3">
            <span className="font-semibold text-textSecondary">Data aktualizacji:</span>
            <span className="px-2.5 py-1 font-mono font-medium rounded-md bg-card text-text border border-gray-200 dark:border-gray-700">
              {commitDate}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}