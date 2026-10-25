// hooks/useDataExport.ts
//
// Pobranie kopii wszystkich danych konta (/api/account/export) jako pliku JSON.

import { useCallback, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { EXPORT_FILE_PREFIX } from "@/config/userData";

function fileNameFrom(disposition: string | null): string {
  const match = /filename="([^"]+)"/.exec(disposition ?? "");
  return match?.[1] ?? `${EXPORT_FILE_PREFIX}_${new Date().toISOString().slice(0, 10)}.json`;
}

export function useDataExport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const exportData = useCallback(async (): Promise<void> => {
    if (!user) {
      toast.error("Zaloguj się, aby pobrać kopię swoich danych.");
      return;
    }
    setExporting(true);
    try {
      const response = await fetch("/api/account/export", { credentials: "same-origin" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Nie udało się przygotować kopii danych.");
      }
      const link = document.createElement("a");
      let objectUrl: string | null = null;
      if (response.headers.get("Content-Disposition")) {
        objectUrl = URL.createObjectURL(await response.blob());
        link.href = objectUrl;
        link.download = fileNameFrom(response.headers.get("Content-Disposition"));
      } else {
        // Duży eksport: serwer zapisał plik w Storage i zwrócił link ważny kilka minut.
        const { downloadUrl, fileName } = (await response.json()) as { downloadUrl: string; fileName: string };
        link.href = downloadUrl;
        link.download = fileName;
      }
      document.body.appendChild(link);
      link.click();
      link.remove();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      toast.success("Pobrano kopię danych.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się przygotować kopii danych.", { cause: error });
    } finally {
      setExporting(false);
    }
  }, [user, toast]);

  return { exportData, exporting };
}
