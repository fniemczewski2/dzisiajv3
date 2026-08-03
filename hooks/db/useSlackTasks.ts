// hooks/db/useSlackTasks.ts

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/providers/ToastProvider";
import type { SlackMappableTaskField } from "@/config/slack";

export interface SlackColumnOption {
  id: string;
  name: string;
  type: string;
}

export interface SlackConnectionState {
  id: string;
  team_name: string | null;
  list_id: string | null;
  list_title: string | null;
  column_map: Partial<Record<SlackMappableTaskField, string>>;
}

interface StatusResponse {
  connected: boolean;
  connection?: SlackConnectionState;
  columns?: SlackColumnOption[];
  error?: string;
}

async function callSlackApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Błąd komunikacji ze Slackiem.");
  return body;
}

export function useSlackTasks() {
  const { toast } = useToast();
  const [connection, setConnection] = useState<SlackConnectionState | null>(null);
  const [columns, setColumns] = useState<SlackColumnOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callSlackApi<StatusResponse>("/api/slack?action=status");
      setConnection(data.connected ? (data.connection ?? null) : null);
      setColumns(data.columns ?? []);
    } catch {
      setConnection(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  const disconnect = useCallback(async () => {
    setBusy(true);
    try {
      await callSlackApi("/api/slack?action=disconnect", { method: "POST" });
      setConnection(null);
      setColumns([]);
      toast.success("Odłączono Slacka.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się odłączyć.");
    } finally {
      setBusy(false);
    }
  }, [toast]);

  const selectList = useCallback(
    async (listInput: string) => {
      setBusy(true);
      try {
        const data = await callSlackApi<{ list_id: string; columns: SlackColumnOption[] }>(
          "/api/slack?action=select-list",
          { method: "POST", body: JSON.stringify({ list: listInput }) }
        );
        setColumns(data.columns);
        setConnection((prev) => (prev ? { ...prev, list_id: data.list_id, column_map: {} } : prev));
        toast.success("Lista podłączona. Zmapuj kolumny.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Nie udało się wybrać listy.");
      } finally {
        setBusy(false);
      }
    },
    [toast]
  );

  const saveColumnMap = useCallback(
    async (columnMap: Partial<Record<SlackMappableTaskField, string>>) => {
      setBusy(true);
      try {
        await callSlackApi("/api/slack?action=column-map", {
          method: "POST",
          body: JSON.stringify({ column_map: columnMap }),
        });
        setConnection((prev) => (prev ? { ...prev, column_map: columnMap } : prev));
        toast.success("Zapisano mapowanie kolumn.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Nie udało się zapisać mapowania.");
      } finally {
        setBusy(false);
      }
    },
    [toast]
  );

  const syncNow = useCallback(async () => {
    setBusy(true);
    try {
      await callSlackApi("/api/slack/sync", { method: "POST" });
      toast.success("Zsynchronizowano ze Slackiem.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Synchronizacja nie powiodła się.");
    } finally {
      setBusy(false);
    }
  }, [toast]);

  return { connection, columns, loading, busy, connect, disconnect, selectList, saveColumnMap, syncNow, refresh };
}

export function triggerSlackSync(): void {
  void fetch("/api/slack/sync", { method: "POST" }).catch(() => undefined);
}
