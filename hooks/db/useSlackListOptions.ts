// hooks/db/useSlackListOptions.ts

import { useEffect, useRef, useState } from "react";

export interface SlackListOption {
  list_id: string;
  list_title: string | null;
  is_default: boolean;
}

interface StatusResponse {
  lists?: { list_id: string; list_title: string | null; is_default: boolean; column_map?: Record<string, string> }[];
}

export function useSlackListOptions(enabled: boolean) {
  const [lists, setLists] = useState<SlackListOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || requestedRef.current) return;
    requestedRef.current = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch("/api/slack?action=status");
        const body = (await response.json().catch(() => ({}))) as StatusResponse & {
          error?: string;
        };
        if (!response.ok) throw new Error(body.error ?? "Nie udało się wczytać list Slack.");
        if (!mountedRef.current) return;

        const usable = (body.lists ?? []).filter((l) => l.column_map?.title);
        setLists(
          usable.map(({ list_id, list_title, is_default }) => ({ list_id, list_title, is_default }))
        );
      } catch (err) {
        if (!mountedRef.current) return;
        // pozwalamy spróbować ponownie po przełączeniu kategorii
        requestedRef.current = false;
        setLists([]);
        setError(err instanceof Error ? err.message : "Nie udało się wczytać list Slack.");
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();
  }, [enabled]);

  const defaultListId = lists.find((l) => l.is_default)?.list_id ?? lists[0]?.list_id ?? "";

  return { lists, loading, error, defaultListId };
}

export async function setSlackTaskTarget(taskId: number, listId: string | null): Promise<void> {
  const response = await fetch("/api/slack?action=set-target", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task_id: taskId, list_id: listId }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Nie udało się przypisać listy Slack do zadania.");
  }
}