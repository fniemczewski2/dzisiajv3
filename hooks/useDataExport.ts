// hooks/useDataExport.ts

import { useCallback, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";
import {
  EXPORT_TABLES,
  EXPORT_PAGE_SIZE,
  EXPORT_FILE_PREFIX,
  type ExportTable,
} from "@/config/dataExport";

type ExportRow = Record<string, unknown>;

interface ExportFile {
  exported_at: string;
  user_id: string;
  email: string | null;
  format_version: number;
  note: string;
  data: Record<string, ExportRow[]>;
  skipped: { table: string; error: string }[];
}

export interface DataExportProgress {
  done: number;
  total: number;
}

const EXPORT_NOTE =
  "Kopia Twoich danych z aplikacji Dzisiaj.Fun. Plik nie zawiera hasel, tokenow " +
  "dostepu do kalendarzy ani kluczy powiadomien push.";

export function useDataExport() {
  const { user, supabase } = useAuth();
  const { toast } = useToast();
  const withRetry = useRetry();

  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<DataExportProgress | null>(null);

  const fetchTable = useCallback(
    async ({ table, columns }: ExportTable): Promise<ExportRow[]> => {
      const rows: ExportRow[] = [];

      for (let page = 0; ; page++) {
        const from = page * EXPORT_PAGE_SIZE;
        const { data, error } = await withRetry(async () =>
          supabase
            .from(table)
            .select(columns ?? "*")
            .range(from, from + EXPORT_PAGE_SIZE - 1)
        );

        if (error) throw error;

        // `table` is a dynamic string spanning every exportable table, so
        // Supabase can't infer a precise row type here — ExportRow is a
        // deliberately opaque `Record<string, unknown>` bag for the export
        // file, not a shape we validate at runtime.
        const batch = (data ?? []) as unknown as ExportRow[];
        rows.push(...batch);
        if (batch.length < EXPORT_PAGE_SIZE) break;
      }

      return rows;
    },
    [supabase, withRetry]
  );

  const exportData = useCallback(async (): Promise<void> => {
    if (!user) {
      toast.error("Musisz byc zalogowany, aby pobrac swoje dane.");
      return;
    }

    setExporting(true);
    setProgress({ done: 0, total: EXPORT_TABLES.length });

    try {
      const data: Record<string, ExportRow[]> = {};
      const skipped: { table: string; error: string }[] = [];

      for (const [index, entry] of EXPORT_TABLES.entries()) {
        try {
          data[entry.table] = await fetchTable(entry);
        } catch (err) {
          skipped.push({
            table: entry.table,
            error: err instanceof Error ? err.message : "Nieznany blad",
          });
        }
        setProgress({ done: index + 1, total: EXPORT_TABLES.length });
      }

      const payload: ExportFile = {
        exported_at: new Date().toISOString(),
        user_id: user.id,
        email: user.email ?? null,
        format_version: 1,
        note: EXPORT_NOTE,
        data,
        skipped,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${EXPORT_FILE_PREFIX}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      const totalRows = Object.values(data).reduce((acc, rows) => acc + rows.length, 0);

      if (skipped.length > 0) {
        toast.error(
          `Pobrano ${totalRows} rekordow, ale ${skipped.length} sekcji sie nie udalo.`
        );
      } else {
        toast.success(`Pobrano kopie danych (${totalRows} rekordow).`);
      }
    } catch {
      toast.error("Nie udalo sie przygotowac kopii danych.");
    } finally {
      setExporting(false);
      setProgress(null);
    }
  }, [user, fetchTable, toast]);

  return { exportData, exporting, progress };
}
