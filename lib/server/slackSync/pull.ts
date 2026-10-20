import { mapPool } from "@/shared/asyncPool";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteItem, isMissingItemError, type SlackColumn, type SlackItem } from "@/lib/server/slackLists";
import { DEFAULT_TASK_STATUS } from "@/config/slack";
import { DEFAULT_TASK_PRIORITY } from "@/config/defaults";
import type { SyncTarget, TaskRow } from "./types";
import { fingerprint, itemToTaskPatch, missingFieldsFromItem } from "./taskMapping";
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

/** Uzupełnia w zadaniu pola puste w aplikacji, a wypełnione w Slacku (bez nadpisywania). */
export async function backfillFromItem(
  admin: SupabaseClient,
  target: SyncTarget,
  item: SlackItem,
  task: TaskRow,
  columns: SlackColumn[]
): Promise<boolean> {
  const missing = missingFieldsFromItem(task, item, target.columnMap, columns);
  if (Object.keys(missing).length === 0) return false;
  await admin.from("tasks").update(missing).eq("id", task.id);
  await touchLink(admin, target, task.id, { ...task, ...missing } as TaskRow);
  return true;
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
    // Zadanie z listy Slacka jest zadaniem właściciela, nie udostępnionym innej osobie.
    for_user_id: target.userId,
    category: target.importCategory,
    status: patch.status ?? DEFAULT_TASK_STATUS,
    priority: patch.priority ?? DEFAULT_TASK_PRIORITY,
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
    // Powiązanie się nie zapisało – usuwamy świeżo utworzone zadanie, żeby nie zostało bez pary.
    await admin.from("tasks").delete().eq("id", taskId);
    // 23505: tę samą pozycję zaimportowała w tej chwili inna synchronizacja (cron i ręczna
    // naraz) – unikalny indeks (list_id, item_id) zablokował duplikat. To nie jest błąd.
    if (linkError.code === "23505") return false;
    console.error(`[slack/sync] nie udało się zapisać powiązania dla ${item.id}:`, linkError.message);
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
  // Jeden po drugim (limit 1) – limit zapytań Slack API.
  await mapPool((data ?? []) as { id: string; item_id: string }[], 1, async (tombstone) => {
    try {
      await deleteItem(target.token, target.listId, tombstone.item_id);
      removed += 1;
    } catch (err) {
      if (!isMissingItemError(err)) throw err;
    }
    await admin.from("slack_deleted_tasks").delete().eq("id", tombstone.id);
  });
  return removed;
}
