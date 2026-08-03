// hooks/db/useSlackListOptions.ts

import { useEffect, useState } from "react";

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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled || loaded || loading) return;

    let cancelled = false;
    setLoading(true);

    void fetch("/api/slack?action=status")
      .then((response) => (response.ok ? (response.json() as Promise<StatusResponse>) : null))
      .then((data) => {
        if (cancelled) return;
        const usable = (data?.lists ?? []).filter((l) => l.column_map?.title);
        setLists(
          usable.map(({ list_id, list_title, is_default }) => ({ list_id, list_title, is_default }))
        );
      })
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, loaded, loading]);

  const defaultListId = lists.find((l) => l.is_default)?.list_id ?? lists[0]?.list_id ?? "";

  return { lists, loading, defaultListId };
}

export async function setSlackTaskTarget(taskId: number, listId: string | null): Promise<void> {
  await fetch("/api/slack?action=set-target", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task_id: taskId, list_id: listId }),
  });
}