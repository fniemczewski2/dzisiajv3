import { MapPin, Tag, ExternalLink, Info, ChevronDown, ChevronUp, Upload } from "lucide-react";
import React, { useState } from "react";
import { CancelButton } from "../CommonButtons";

interface ImportPlacesProps {
  onImport: (jsonData: any, fetchGoogleData: boolean, autoTag: boolean) => Promise<number>;
  onCollapse: () => void;
}

export default function ImportPlaces({ onImport, onCollapse }: ImportPlacesProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [autoTagEnabled, setAutoTagEnabled] = useState(true);
  const [fetchGoogleData, setFetchGoogleData] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error" | "info" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus({ type: null, message: "" });

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      if (!jsonData.features || !Array.isArray(jsonData.features)) {
        throw new Error("Nieprawidłowy format pliku JSON");
      }

      setImportStatus({
        type: "info",
        message: `Importowanie ${jsonData.features.length} miejsc...`,
      });

      const count = await onImport(jsonData, fetchGoogleData, autoTagEnabled);

      setImportStatus({
        type: "success",
        message: `Pomyślnie zaimportowano ${count} miejsc.`,
      });

      e.target.value = "";
    } catch (error: any) {
      setImportStatus({
        type: "error",
        message: error.message || "Błąd podczas importu",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="mb-6 p-4 sm:p-6 bg-card border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-4">
      <h3 className="text-lg font-bold text-text mb-4">Importuj z Google Maps</h3>

      <div className="bg-surface border border-gray-200 dark:border-gray-700 rounded-xl mb-5 overflow-hidden">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="w-full flex items-center justify-between p-4 hover:bg-surfaceHover transition-colors"
        >
          <div className="flex items-center gap-3 text-text">
            <Info className="w-5 h-5 text-primary" />
            <span className="font-bold">Skąd wziąć plik JSON?</span>
          </div>
          <div className="text-textMuted">
            {showInstructions ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {showInstructions && (
          <div className="p-4 pt-0 border-t border-gray-100 dark:border-gray-800 bg-surface/50">
            <ol className="space-y-3 text-sm text-textSecondary mt-3 font-medium">
              <li className="flex gap-2 items-start">
                <span className="font-bold text-primary">1.</span>
                <span>
                  Wejdź na stronę{' '}
                  <a href="https://takeout.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    Google Takeout <ExternalLink className="w-3 h-3" />
                  </a>
                </span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="font-bold text-primary">2.</span>
                <span>Odznacz wszystko i wybierz tylko <strong>Mapy (Twoje miejsca)</strong></span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="font-bold text-primary">3.</span>
                <span>Kliknij <strong>Następny krok</strong>, a potem <strong>Utwórz eksport</strong></span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="font-bold text-primary">4.</span>
                <span>Pobierz paczkę ZIP z maila i wypakuj z niej plik JSON</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="font-bold text-primary">5.</span>
                <span>Prześlij wypakowany plik w formularzu poniżej</span>
              </li>
            </ol>
          </div>
        )}
      </div>

      <div className="space-y-3 mb-6">
        <p className="text-xs font-bold text-textMuted uppercase tracking-wider">Opcje skanowania:</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer border-2 transition-all ${
            fetchGoogleData ? "border-primary bg-primary/5" : "bg-surface border-transparent hover:border-gray-300 dark:hover:border-gray-600"
          }`}>
            <input
              type="checkbox"
              checked={fetchGoogleData}
              onChange={(e) => setFetchGoogleData(e.target.checked)}
              className="w-5 h-5 text-primary rounded accent-primary bg-card"
              disabled={isImporting}
            />
            <div>
              <div className="flex items-center gap-2 font-bold text-text text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                Dociągnij dane (Google Places)
              </div>
              <p className="text-xs text-textMuted mt-0.5">Pobiera telefon, WWW i godziny otwarcia.</p>
            </div>
          </label>

          <label className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer border-2 transition-all ${
            autoTagEnabled ? "border-primary bg-primary/5" : "bg-surface border-transparent hover:border-gray-300 dark:hover:border-gray-600"
          }`}>
            <input
              type="checkbox"
              checked={autoTagEnabled}
              onChange={(e) => setAutoTagEnabled(e.target.checked)}
              className="w-5 h-5 text-primary rounded accent-primary bg-card"
              disabled={isImporting}
            />
            <div>
              <div className="flex items-center gap-2 font-bold text-text text-sm">
                <Tag className="w-4 h-4 text-primary" />
                Sztuczna Inteligencja
              </div>
              <p className="text-xs text-textMuted mt-0.5">Generuje tagi określające styl miejsca (kawiarnia, park itp.)</p>
            </div>
          </label>
        </div>
      </div>

      {importStatus.type && (
        <div className={`p-4 mb-5 rounded-xl text-sm font-bold flex items-center justify-center ${
          importStatus.type === "success" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
          importStatus.type === "error" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        }`}>
          {importStatus.message}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <label className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm ${
          isImporting ? "bg-surface text-textMuted cursor-not-allowed border border-gray-200 dark:border-gray-700" : "bg-primary hover:bg-secondary text-white cursor-pointer"
        }`}>
          {isImporting ? (
            <>
              Przetwarzanie... <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            </>
          ) : (
            <>Wgraj plik JSON <Upload className="w-5 h-5" /></>
          )}
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            disabled={isImporting}
            className="hidden"
          />
        </label>
        
        <CancelButton onCancel={onCollapse} />
      </div>
    </div>
  );
}