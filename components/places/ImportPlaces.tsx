// components/Places/ImportPlaces.tsx
import { MapPin, Tag, ExternalLink, Info, ChevronDown, ChevronUp, Upload } from "lucide-react";
import React, { useState } from "react";
import { CancelButton } from "../CommonButtons";

interface ImportPlacesProps {
  onImport: (
    jsonData: any,
    fetchGoogleData: boolean,
    autoTag: boolean
  ) => Promise<number>;
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

      // Show progress
      setImportStatus({
        type: "info",
        message: `Importowanie ${jsonData.features.length} miejsc...`,
      });

      const count = await onImport(jsonData, fetchGoogleData, autoTagEnabled);

      setImportStatus({
        type: "success",
        message: `Pomyślnie zaimportowano ${count} miejsc${
          fetchGoogleData ? " z danymi Google" : ""
        }${autoTagEnabled ? " z automatycznymi tagami" : ""}`,
      });

      e.target.value = "";
    } catch (error: any) {
      console.error("Import error:", error);
      setImportStatus({
        type: "error",
        message: error.message || "Błąd podczas importu",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4 mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
      {/* Header with collapse button */}
      <div className="flex items-center justify-between">
        <h3 className="text-md font-semibold text-gray-900">
          Import pliku
        </h3>

      </div>

      <div className="p-4 shadow-sm bg-white border-2 border-gray-200 rounded-lg">
      <button
        onClick={() => setShowInstructions(!showInstructions)}
        className="w-full flex items-center justify-between transition"
      >
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5" />
          <span className="font-semibold font-sm w-full">
            Skąd wziąć plik JSON?
          </span>
        </div>
        {showInstructions ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </button>

      {/* Instructions content */}
      {showInstructions && (
          <ol className="mt-4 space-y-3 text-sm text-gray-700">
            <li className="flex gap-3">
                <p className="font-medium flex items-center">1. Wejdź na&nbsp;
                <a
                  href="https://takeout.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-secondary underline flex items-center gap-1"
                >
                  Google Takeout
                  <ExternalLink className="w-3 h-3" />
                </a>
                </p>
            </li>

            <li className="flex gap-3">
                <p className="font-medium flex items-center">2. Wybierz tylko&nbsp;<p className="italic">Mapy (Twoje miejsca)</p></p>
            </li>

            <li className="flex gap-3">
                <p className="font-medium flex items-center">3. Kliknij&nbsp;<p className="italic">Następny krok</p>&nbsp;i&nbsp;<p className="italic">Utwórz eksport</p></p>
            </li>

            <li className="flex gap-3">
                <p className="font-medium flex items-center">4. Pobierz archiwum z maila i wypakuj</p>
            </li>

            <li className="flex gap-3">
                <p className="font-medium">5. Prześlij plik</p>
            </li>
          </ol>
      )}
      </div>

      {/* Options checkboxes */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Opcje importu:</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center gap-3 p-4 bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary hover:bg-gray-50 transition-all">
            <input
              type="checkbox"
              checked={fetchGoogleData}
              onChange={(e) => setFetchGoogleData(e.target.checked)}
              className="w-5 h-5 text-primary focus:ring-primary rounded"
              disabled={isImporting}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium text-gray-900">
                <MapPin className="w-4 h-4 text-primary" />
                Dane z Google Places
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Pobierz telefon, stronę, godziny otwarcia
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary hover:bg-gray-50 transition-all">
            <input
              type="checkbox"
              checked={autoTagEnabled}
              onChange={(e) => setAutoTagEnabled(e.target.checked)}
              className="w-5 h-5 text-primary focus:ring-primary rounded"
              disabled={isImporting}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium text-gray-900">
                <Tag className="w-4 h-4 text-primary" />
                Automatyczne tagi
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Rozpoznaj typ miejsca, ceny, atmosferę 
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* File upload button */}
      <div className="flex gap-3">
        <label
          htmlFor="file-upload"
          className={`px-3 py-1 flex rounded-lg flex-nowrap items-center transition disabled:opacity-50 ${
            isImporting
              ? "bg-gray-300 cursor-not-allowed text-gray-600"
              : "bg-primary hover:bg-secondary text-white "
          }`}
        >
          {isImporting ? (
            <>
              Importowanie...&nbsp;
              <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
            </>
          ) : (
            <>
              
              Prześlij&nbsp;
              <Upload className="w-5 h-5" />

            </>
          )}
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          disabled={isImporting}
          className="hidden"
        />
        <CancelButton
          onCancel={onCollapse}     
        />
      </div>
    </div>
  );
}