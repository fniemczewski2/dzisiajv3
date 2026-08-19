// lib/server/slackSync/syncList.ts
// Per-list sync orchestration: reconciles one Slack list against the tasks
// targeting it (split out of the former 717-line pages/api/slack/sync.ts).

import type { SupabaseClient } from "@supabase/supabase-js";
import { listItems, itemExists, type SlackColumn, type SlackItem } from "@/lib/server/slackLists";
import { SLACK_TASK_CATEGORY } from "@/config/slack";
import type { LinkRow, SyncCounters, SyncTarget, TaskRow } from "./types";
import { fingerprint, itemChangedSince, itemUpdatedAt, resolveDirection, taskUpdatedAt } from "./taskMapping";
import { pushTask } from "./push";
import { applyAppDeletions, createTaskFromItem, pullItem } from "./pull";

const FATAL_SYNC_ERRORS = new Set([
  "invalid_auth",
  "token_expired",
  "token_revoked",
  "account_inactive",
  "not_authed",
  "missing_scope",
  "not_allowed_token_type",
  "ratelimited",
  "list_not_found",
]);

function isFatalSlackError(err: unknown): boolean {
  const code = (err as { slackError?: string }).slackError;
  return code !== undefined && FATAL_SYNC_ERRORS.has(code);
}

export function belongsOnList(
  task: Pick<TaskRow, "category">,
  chosenListId: string | undefined,
  target: Pick<SyncTarget, "listId" | "isDefault">
): boolean {
  if (task.category !== SLACK_TASK_CATEGORY) return false;
  return chosenListId ? chosenListId === target.listId : target.isDefault;
}

function recordSyncFailure(counters: SyncCounters, err: unknown, what: string): void {
  counters.failed += 1;
  const message = err instanceof Error ? err.message : String(err);
  counters.first_error ??= `${what}: ${message}`;
  console.error(`[slack/sync] ${what}:`, message);
}

// Reconciles a single task against its (possibly absent) Slack item. Pulled
// out to a top-level function — as a closure inside syncList, its branching
// counted directly against that function's cognitive complexity.
async function syncOneTask(
  admin: SupabaseClient,
  target: SyncTarget,
  task: TaskRow,
  columns: SlackColumn[],
  linkByTask: Map<number, LinkRow>,
  itemById: Map<string, SlackItem>,
  linkedAnywhere: Set<number>,
  targetListByTask: Map<number, string>,
  counters: SyncCounters
): Promise<void> {
  const link = linkByTask.get(task.id);

  if (!link) {
    if (linkedAnywhere.has(task.id)) return;
    if (!belongsOnList(task, targetListByTask.get(task.id), target)) return;
    await pushTask(admin, target, task, columns, undefined);
    linkedAnywhere.add(task.id);
    counters.created_in_slack += 1;
    return;
  }
  if (task.category !== SLACK_TASK_CATEGORY) return;

  const item = itemById.get(link.item_id);

  if (!item) {
    if (await itemExists(target.token, target.listId, link.item_id)) return;
    await admin
      .from("slack_task_links")
      .delete()
      .eq("task_id", task.id)
      .eq("list_id", target.listId);
    await admin
      .from("slack_deleted_tasks")
      .delete()
      .eq("list_id", target.listId)
      .eq("item_id", link.item_id);

    await pushTask(admin, target, task, columns, undefined);
    counters.recreated_in_slack += 1;
    return;
  }

  const appChanged = fingerprint(task) !== link.task_fingerprint;
  const slackChanged = itemChangedSince(item, link.synced_at);
  if (appChanged && slackChanged) counters.conflicts += 1;

  const direction = resolveDirection({
    appChanged,
    slackChanged,
    taskUpdatedAt: taskUpdatedAt(task),
    itemUpdatedAt: itemUpdatedAt(item),
  });

  if (direction === "push") {
    await pushTask(admin, target, task, columns, link);
    counters.pushed += 1;
  } else if (direction === "pull") {
    await pullItem(admin, target, item, task, columns);
    counters.pulled += 1;
  }
}

export async function syncList(
  admin: SupabaseClient,
  target: SyncTarget,
  tasks: TaskRow[],
  linkedAnywhere: Set<number>,
  targetListByTask: Map<number, string>
): Promise<SyncCounters> {
  const counters: SyncCounters = {
    list_id: target.listId,
    list_title: target.listTitle,
    pushed: 0,
    pulled: 0,
    created_in_slack: 0,
    created_in_app: 0,
    deleted_in_slack: 0,
    recreated_in_slack: 0,
    conflicts: 0,
    failed: 0,
    first_error: null,
  };

  const { items, columns } = await listItems(target.token, target.listId);
  counters.deleted_in_slack = await applyAppDeletions(admin, target);

  const { data: linkRows, error: linkError } = await admin
    .from("slack_task_links")
    .select("task_id, list_id, item_id, synced_at, task_fingerprint")
    .eq("list_id", target.listId);

  if (linkError) throw new Error(`slack_task_links: ${linkError.message}`);

  const links = (linkRows ?? []) as LinkRow[];
  const linkByTask = new Map(links.map((l) => [l.task_id, l]));
  const itemById = new Map(items.map((i) => [i.id, i]));
  const linkedItemIds = new Set(links.map((l) => l.item_id));

  for (const task of tasks) {
    try {
      await syncOneTask(admin, target, task, columns, linkByTask, itemById, linkedAnywhere, targetListByTask, counters);
    } catch (err) {
      if (isFatalSlackError(err)) throw err;
      recordSyncFailure(counters, err, `zadanie ${task.id}`);
    }
  }

  const { data: pendingRows } = await admin
    .from("slack_deleted_tasks")
    .select("item_id")
    .eq("user_id", target.userId)
    .eq("list_id", target.listId);
  const pendingDeletion = new Set(
    (pendingRows ?? []).map((r) => (r as { item_id: string }).item_id)
  );

  for (const item of items) {
    if (linkedItemIds.has(item.id) || pendingDeletion.has(item.id)) continue;
    try {
      if (await createTaskFromItem(admin, target, item, columns)) counters.created_in_app += 1;
    } catch (err) {
      if (isFatalSlackError(err)) throw err;
      recordSyncFailure(counters, err, `pozycja ${item.id}`);
    }
  }

  return counters;
}
