// lib/server/slackSync/pull.ts
// Slack -> App direction of the sync (split out of the former 717-line
// pages/api/slack/sync.ts).

import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteItem, isMissingItemError, type SlackColumn, type SlackItem } from "@/lib/server/slackLists";
import { SLACK_TASK_CATEGORY, DEFAULT_TASK_STATUS } from "@/config/slack";
import type { SyncTarget, TaskRow } from "./types";
import { fingerprint, itemToTaskPatch } from "./taskMapping";
import { touchLink } from "./push";

export async function pullItem(
  admin: SupabaseClient,
  target: SyncTarget,
  item: SlackItem,
  task: TaskRow,
  columns: SlackColumn[]
): Promise<void> {
  const patch = itemToTaskPatch(item, target.columnMap, columns);
  if (Object.keys(patch).length === 0) return;

  await admin.from("tasks").update(patch).eq("id", task.id);
  await touchLink(admin, target, task.id, { ...task, ...patch } as TaskRow);
}

export async function createTaskFromItem(
  admin: SupabaseClient,
  target: SyncTarget,
  item: SlackItem,
  columns: SlackColumn[]
): Promise<boolean> {
  const patch = itemToTaskPatch(item, target.columnMap, columns);
  if (!patch.title) return false;

  const { data: existing, error: existingError } = await admin
    .from("slack_task_links")
    .select("task_id")
    .eq("list_id", target.listId)
    .eq("item_id", item.id)
    .maybeSingle();

  if (existingError) throw new Error(`slack_task_links: ${existingError.message}`);
  if (existing) return false;

  const row = {
    ...patch,
    user_id: target.userId,
    category: SLACK_TASK_CATEGORY,
    status: patch.status ?? DEFAULT_TASK_STATUS,
  };

  const { data, error } = await admin.from("tasks").insert(row).select("id").single();

  if (error || !data) {
    console.error(`[slack/sync] nie udało się utworzyć zadania z ${item.id}:`, error?.message);
    return false;
  }

  const taskId = (data as { id: number }).id;

  const { error: linkError } = await admin.from("slack_task_links").insert({
    task_id: taskId,
    user_id: target.userId,
    list_id: target.listId,
    item_id: item.id,
    task_fingerprint: fingerprint({ ...row, id: taskId } as TaskRow),
    synced_at: new Date().toISOString(),
  });

  if (linkError) {
    console.error(`[slack/sync] nie udało się zapisać powiązania dla ${item.id}:`, linkError.message);
    await admin.from("tasks").delete().eq("id", taskId);
    throw new Error(`slack_task_links: ${linkError.message}`);
  }
  return true;
}

export async function applyAppDeletions(admin: SupabaseClient, target: SyncTarget): Promise<number> {
  const { data } = await admin
    .from("slack_deleted_tasks")
    .select("id, item_id")
    .eq("user_id", target.userId)
    .eq("list_id", target.listId);

  let removed = 0;
  for (const tombstone of (data ?? []) as { id: string; item_id: string }[]) {
    try {
      await deleteItem(target.token, target.listId, tombstone.item_id);
      removed += 1;
    } catch (err) {
      // pozycja mogła zostać już usunięta ręcznie w Slacku - to nie jest błąd
      if (!isMissingItemError(err)) throw err;
    }
    await admin.from("slack_deleted_tasks").delete().eq("id", tombstone.id);
  }
  return removed;
}
