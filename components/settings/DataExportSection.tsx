// components/settings/DataExportSection.tsx

import React from "react";
import { Download, Loader2 } from "lucide-react";
import { useDataExport } from "@/hooks/useDataExport";

export default function DataExportSection() {
  const { exportData, exporting } = useDataExport();

  return (
    <section className="card mb-4 p-4 shadow-sm transition-colors sm:p-6" id="kopia">
      <div className="mb-4 flex items-center gap-3 text-text">
        <h3 className="text-lg font-bold">Kopia danych</h3>
      </div>

      <p className="mb-4 text-sm text-text-secondary">
        Pobierz wszystkie swoje dane z aplikacji w jednym pliku JSON. Plik nie zawiera haseł ani tokenów dostępu do
        integracji.
      </p>

      <button
        type="button"
        onClick={() => void exportData()}
        disabled={exporting}
        aria-busy={exporting}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 font-semibold text-text-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {exporting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Przygotowuję kopię…
          </>
        ) : (
          <>
            Pobierz
            <Download className="h-5 w-5" aria-hidden="true" />
          </>
        )}
      </button>
    </section>
  );
}
