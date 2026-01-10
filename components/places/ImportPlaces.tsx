import { Upload } from "lucide-react";
import React, { useState } from "react";

interface ImportPlacesProps {
  onImport: (jsonData: any, fetchGoogleData: boolean) => Promise<number>;
}

export default function ImportPlaces({ onImport }: ImportPlacesProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error" | null;
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
      const count = await onImport(jsonData, true);
      setImportStatus({
        type: "success",
        message: `Pomyślnie zaimportowano ${count} miejsc z danymi Google`,
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
    <>
      <div className="flex items-center gap-4">
        <label
          htmlFor="file-upload"
          className={`px-3 py-1.5 flex items-center gap-2 cursor-pointer rounded-lg shadow transition-colors ${
            isImporting
              ? "bg-gray-300 cursor-not-allowed text-gray-600"
              : "bg-primary hover:bg-secondary text-white"
          }`}
        >
          {isImporting ? "Importowanie..." : "Importuj"}
          <Upload className="w-4 h-4" />
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          disabled={isImporting}
          className="hidden"
        />
      </div>

      {importStatus.type && (
        <div
          className={`p-4 rounded-lg mt-4 ${
            importStatus.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {importStatus.message}
        </div>
      )}
    </>
  );
}