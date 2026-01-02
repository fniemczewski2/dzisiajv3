// components/VersionInfo.tsx
import { Info } from "lucide-react";
import { useVersion } from "../../hooks/useVersion";

export default function VersionInfo() {
  const { version, commitDate, commitHash, loading, error } = useVersion();

  return (
    <div className="bg-card p-6 mb-6 rounded-xl shadow space-y-4">
          <h3 className="text-xl font-semibold flex items-center"><Info className="w-5 h-5 mr-2 text-gray-600" />Informacje o wersji</h3>
          {loading ? (
            <div className="text-xs text-gray-500">Ładowanie wersji...</div>
          ) : error ? (
            <div className="text-xs text-red-700">
              Błąd: {error}
            </div>
          ) : (
            <>
              <div className="text-sm text-gray-600 bg-gray-100 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="font-mono">Ver:</span>
                  <span className="font-mono font-bold text-primary">
                    {version}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-mono">Data:</span>
                  <span className="font-mono">{commitDate}</span>
                </div>
              </div>
            </>
          )}
        </div>
  );
}