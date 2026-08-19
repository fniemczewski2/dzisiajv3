// components/settings/DataExportSection.tsx

import React from "react";
import { Download, Loader2 } from "lucide-react";
import { useDataExport } from "@/hooks/useDataExport";

export default function DataExportSection() {
  const { exportData, exporting, progress } = useDataExport();

  const percent = progress ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <section className="card rounded-xl shadow-sm p-4 sm:p-6 mb-4 transition-colors">
      <div className="flex items-center gap-3 text-text mb-4">
        <Download className="w-5 h-5 text-primary shrink-0" />
        <h3 className="text-lg font-bold">Kopia moich danych</h3>
      </div>

      <p className="text-sm text-textSecondary mb-4">
        Pobierz wszystkie swoje dane z aplikacji w jednym pliku JSON.
      </p>

      <button
        type="button"
        onClick={() => void exportData()}
        disabled={exporting}
        aria-busy={exporting}
        className="font-semibold px-4 py-2 w-full bg-surface hover:bg-surfaceHover text-textSecondary rounded-lg flex justify-center items-center gap-2 border border-gray-200 dark:border-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {exporting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            Przygotowuję kopię…
          </>
        ) : (
          <>
            Pobierz
            <Download className="w-5 h-5" aria-hidden="true" />
          </>
        )}
      </button>

      {progress && (
        <div className="mt-4">
          <progress
            className="h-2 w-full rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-surface [&::-webkit-progress-value]:bg-primary [&::-webkit-progress-value]:transition-all [&::-webkit-progress-value]:duration-200 [&::-moz-progress-bar]:bg-primary"
            value={progress.done}
            max={progress.total}
            aria-label="Postęp przygotowania kopii danych"
          >
            {percent}%
          </progress>
          <p className="mt-2 text-xs text-textSecondary" aria-live="polite">
            Sekcja {progress.done} z {progress.total}
          </p>
        </div>
      )}
    </section>
  );
}
