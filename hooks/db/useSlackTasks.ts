// hooks/db/useSlackTasks.ts

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/providers/ToastProvider";
import type { SlackMappableTaskField } from "@/config/slack";

export interface SlackColumnOption {
  id: string;
  name: string;
  type: string;
}

export interface SlackAccount {
  id: string;
  team_id: string;
  team_name: string | null;
}

export interface SlackListConfig {
  id: string;
  connection_id: string;
  list_id: string;
  list_title: string | null;
  column_map: Partial<Record<SlackMappableTaskField, string>>;
  is_default: boolean;
  sync_enabled: boolean;
  assignee_emails: string[] | null;
  /** Kategoria zadań z tej listy (od 1.40). */
  import_category?: string | null;
}

interface StatusResponse {
  connections: SlackAccount[];
  lists: SlackListConfig[];
}

interface SyncResponse {
  lists?: number;
  results?: { list_id: string; error?: string; first_error?: string | null }[];
}

async function callSlackApi<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...init, headers });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Błąd komunikacji ze Slackiem.");
  return body;
}

const NO_ACCOUNTS: SlackAccount[] = [];
const NO_LISTS: SlackListConfig[] = [];

export function useSlackTasks() {
  const { toast } = useToast();
  const [columnsByList, setColumnsByList] = useState<Record<string, SlackColumnOption[]>>({});
  const [busy, setBusy] = useState(false);

  // Stan połączeń ze Slackiem (TanStack Query – wspólny dla sekcji ustawień).
  const statusQuery = useQuery({
    queryKey: ["slack-status"],
    queryFn: () => callSlackApi<StatusResponse>("/api/slack?action=status"),
  });
  const accounts = statusQuery.data?.connections ?? NO_ACCOUNTS;
  const lists = statusQuery.data?.lists ?? NO_LISTS;
  const loading = statusQuery.isPending;
  let statusError: string | null = null;
  if (statusQuery.error) {
    statusError =
      statusQuery.error instanceof Error ? statusQuery.error.message : "Nie udało się odczytać połączeń ze Slackiem.";
  }
  const refetchStatus = statusQuery.refetch;
  const refresh = useCallback(async () => {
    await refetchStatus();
  }, [refetchStatus]);

  const loadColumns = useCallback(async (listRowId: string) => {
    try {
      const data = await callSlackApi<{ columns: SlackColumnOption[] }>(
        `/api/slack?action=columns&list_row_id=${encodeURIComponent(listRowId)}`
      );
      setColumnsByList((prev) => ({ ...prev, [listRowId]: data.columns }));
    } catch {
      setColumnsByList((prev) => ({ ...prev, [listRowId]: [] }));
    }
  }, []);

  const runAction = useCallback(
    async (fn: () => Promise<void>, successMessage: string, errorMessage: string) => {
      setBusy(true);
      try {
        await fn();
        toast.success(successMessage);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : errorMessage);
      } finally {
        setBusy(false);
      }
    },
    [toast]
  );

  const connect = useCallback(async () => {
    setBusy(true);
    try {
      const { url } = await callSlackApi<{ url: string }>("/api/slack?action=auth-url");
      globalThis.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się rozpocząć łączenia.");
      setBusy(false);
    }
  }, [toast]);

  const disconnectAccount = useCallback(
    (connectionId: string) =>
      runAction(
        async () => {
          await callSlackApi("/api/slack?action=disconnect", {
            method: "POST",
            body: JSON.stringify({ connection_id: connectionId }),
          });
          await refresh();
        },
        "Odłączono konto Slack.",
        "Nie udało się odłączyć konta."
      ),
    [runAction, refresh]
  );

  const addList = useCallback(
    (connectionId: string, listInput: string, title: string, syncEnabled: boolean) =>
      runAction(
        async () => {
          await callSlackApi("/api/slack?action=add-list", {
            method: "POST",
            body: JSON.stringify({
              connection_id: connectionId,
              list: listInput,
              title,
              sync_enabled: syncEnabled,
            }),
          });
          await refresh();
        },
        "Lista podłączona. Zmapuj kolumny.",
        "Nie udało się podłączyć listy."
      ),
    [runAction, refresh]
  );

  const removeList = useCallback(
    (listRowId: string) =>
      runAction(
        async () => {
          await callSlackApi("/api/slack?action=remove-list", {
            method: "POST",
            body: JSON.stringify({ list_row_id: listRowId }),
          });
          await refresh();
        },
        "Lista odłączona.",
        "Nie udało się odłączyć listy."
      ),
    [runAction, refresh]
  );

  const saveList = useCallback(
    (
      listRowId: string,
      columnMap: SlackListConfig["column_map"],
      isDefault: boolean,
      syncEnabled: boolean,
      assigneeEmails: string,
      importCategory: string
    ) =>
      runAction(
        async () => {
          await callSlackApi("/api/slack?action=save-list", {
            method: "POST",
            body: JSON.stringify({
              list_row_id: listRowId,
              column_map: columnMap,
              is_default: isDefault,
              sync_enabled: syncEnabled,
              assignee_emails: assigneeEmails,
              import_category: importCategory,
            }),
          });
          await refresh();
        },
        "Zapisano ustawienia listy.",
        "Nie udało się zapisać ustawień."
      ),
    [runAction, refresh]
  );

  const syncNow = useCallback(
    () =>
      runAction(
        async () => {
          const data = await callSlackApi<SyncResponse>("/api/slack/sync", { method: "POST" });

          const problem = (data.results ?? []).map((result) => result.error ?? result.first_error).find(Boolean);
          if (problem) throw new Error(problem);

          await refresh();
        },
        "Zsynchronizowano ze Slackiem.",
        "Synchronizacja nie powiodła się."
      ),
    [runAction, refresh]
  );

  return {
    statusError,
    accounts,
    lists,
    columnsByList,
    loading,
    busy,
    connect,
    disconnectAccount,
    addList,
    removeList,
    saveList,
    loadColumns,
    syncNow,
    refresh,
  };
}

export function triggerSlackSync(): void {
  void fetch("/api/slack/sync", { method: "POST" }).catch(() => undefined);
}
