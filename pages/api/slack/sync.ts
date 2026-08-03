// pages/api/slack/sync.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/server/tokenCrypto";
import {
  listItems,
  createItem,
  updateItem,
  deleteItem,
  buildFieldValue,
  readFieldValue,
  translateSlackError,
  type SlackColumn,
  type SlackItem,
  type SlackFieldValue,
} from "@/lib/server/slackLists";
import {
  SLACK_MAPPABLE_TASK_FIELDS,
  SLACK_TASK_CATEGORY,
  SLACK_PULL_EXCLUDED_FIELDS,
  type SlackMappableTaskField,
} from "@/config/slack";

interface TaskRow {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  category: string | null;
  priority: number | null;
  status: string | null;
  user_id: string;
}

interface LinkRow {
  task_id: number;
  list_id: string;
  item_id: string;
  synced_at: string;
  task_fingerprint: string;
}

interface ConnectionRow {
  id: string;
  user_id: string;
  access_token: string;
  list_id: string | null;
  column_map: Partial<Record<SlackMappableTaskField, string>>;
}

interface SyncCounters {
  pushed: number;
  pulled: number;
  created_in_slack: number;
  created_in_app: number;
  deleted_in_slack: number;
  deleted_in_app: number;
  conflicts: number;
}

function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

function fingerprint(task: TaskRow): string {
  return SLACK_MAPPABLE_TASK_FIELDS.map((field) => String(task[field] ?? "")).join("\u0001");
}

function taskFieldValue(task: TaskRow, field: SlackMappableTaskField): string | number | null {
  return task[field] ?? null;
}

function buildFields(
  task: TaskRow,
  columnMap: ConnectionRow["column_map"],
  columns: SlackColumn[]
): SlackFieldValue[] {
  const byId = new Map(columns.map((c) => [c.id, c]));
  const fields: SlackFieldValue[] = [];

  for (const field of SLACK_MAPPABLE_TASK_FIELDS) {
    const columnId = columnMap[field];
    if (!columnId) continue;
    const column = byId.get(columnId);
    if (!column) continue;
    const value = buildFieldValue(column, taskFieldValue(task, field));
    if (value) fields.push(value);
  }
  return fields;
}

function itemToTaskPatch(
  item: SlackItem,
  columnMap: ConnectionRow["column_map"]
): Partial<TaskRow> {
  const byColumn = new Map(
    (item.fields ?? []).filter((f) => f.column_id).map((f) => [f.column_id as string, f])
  );
  const patch: Record<string, string | number | null> = {};

  for (const field of SLACK_MAPPABLE_TASK_FIELDS) {
    if (SLACK_PULL_EXCLUDED_FIELDS.includes(field)) continue;
    const columnId = columnMap[field];
    if (!columnId) continue;
    const cell = byColumn.get(columnId);
    if (!cell) continue;
    const raw = readFieldValue(cell);
    if (raw === null) continue;
    patch[field] = field === "priority" ? Number(raw) || null : raw;
  }
  return patch as Partial<TaskRow>;
}

function itemChangedSince(item: SlackItem, syncedAt: string): boolean {
  const updated = Number(item.updated_timestamp ?? 0) * 1000;
  return updated > new Date(syncedAt).getTime();
}

async function pushTask(
  admin: SupabaseClient,
  connection: ConnectionRow,
  token: string,
  task: TaskRow,
  columns: SlackColumn[],
  link: LinkRow | undefined
): Promise<"created" | "updated"> {
  const listId = connection.list_id as string;
  const fields = buildFields(task, connection.column_map, columns);

  if (link) {
    await updateItem(token, listId, link.item_id, fields);
  } else {
    const itemId = await createItem(token, listId, fields);
    await admin.from("slack_task_links").insert({
      task_id: task.id,
      user_id: task.user_id,
      list_id: listId,
      item_id: itemId,
      task_fingerprint: fingerprint(task),
      synced_at: new Date().toISOString(),
    });
    return "created";
  }

  await admin
    .from("slack_task_links")
    .update({ task_fingerprint: fingerprint(task), synced_at: new Date().toISOString() })
    .eq("task_id", task.id)
    .eq("list_id", listId);
  return "updated";
}

async function pullItem(
  admin: SupabaseClient,
  connection: ConnectionRow,
  item: SlackItem,
  task: TaskRow
): Promise<void> {
  const patch = itemToTaskPatch(item, connection.column_map);
  if (Object.keys(patch).length === 0) return;

  await admin.from("tasks").update(patch).eq("id", task.id);
  await admin
    .from("slack_task_links")
    .update({
      task_fingerprint: fingerprint({ ...task, ...patch } as TaskRow),
      synced_at: new Date().toISOString(),
    })
    .eq("task_id", task.id)
    .eq("list_id", connection.list_id as string);
}

async function createTaskFromItem(
  admin: SupabaseClient,
  connection: ConnectionRow,
  item: SlackItem
): Promise<boolean> {
  const patch = itemToTaskPatch(item, connection.column_map);
  if (!patch.title) return false;

  const { data, error } = await admin
    .from("tasks")
    .insert({
      ...patch,
      user_id: connection.user_id,
      category: SLACK_TASK_CATEGORY,
      status: patch.status ?? "pending",
    })
    .select("id")
    .single();

  if (error || !data) return false;

  await admin.from("slack_task_links").insert({
    task_id: (data as { id: number }).id,
    user_id: connection.user_id,
    list_id: connection.list_id as string,
    item_id: item.id,
    task_fingerprint: "",
    synced_at: new Date().toISOString(),
  });
  return true;
}

async function applyAppDeletions(
  admin: SupabaseClient,
  connection: ConnectionRow,
  token: string
): Promise<number> {
  const { data } = await admin
    .from("slack_deleted_tasks")
    .select("id, item_id")
    .eq("user_id", connection.user_id)
    .eq("list_id", connection.list_id as string);

  const tombstones = (data ?? []) as { id: string; item_id: string }[];
  let removed = 0;

  for (const tombstone of tombstones) {
    try {
      await deleteItem(token, connection.list_id as string, tombstone.item_id);
      removed += 1;
    } catch (err) {
      if ((err as { slackError?: string }).slackError !== "item_not_found") throw err;
    }
    await admin.from("slack_deleted_tasks").delete().eq("id", tombstone.id);
  }
  return removed;
}

async function syncConnection(
  admin: SupabaseClient,
  connection: ConnectionRow
): Promise<SyncCounters> {
  const counters: SyncCounters = {
    pushed: 0,
    pulled: 0,
    created_in_slack: 0,
    created_in_app: 0,
    deleted_in_slack: 0,
    deleted_in_app: 0,
    conflicts: 0,
  };
  if (!connection.list_id) return counters;

  const token = decryptToken(connection.access_token);
  const { items, columns } = await listItems(token, connection.list_id);

  const { data: taskRows } = await admin
    .from("tasks")
    .select("id, title, description, due_date, category, priority, status, user_id")
    .eq("user_id", connection.user_id);
  const tasks = (taskRows ?? []) as TaskRow[];

  const { data: linkRows } = await admin
    .from("slack_task_links")
    .select("task_id, list_id, item_id, synced_at, task_fingerprint")
    .eq("user_id", connection.user_id)
    .eq("list_id", connection.list_id);
  const links = (linkRows ?? []) as LinkRow[];

  counters.deleted_in_slack = await applyAppDeletions(admin, connection, token);

  const linkByTask = new Map(links.map((l) => [l.task_id, l]));
  const itemById = new Map(items.map((i) => [i.id, i]));
  const linkedItemIds = new Set(links.map((l) => l.item_id));

  for (const task of tasks) {
    const link = linkByTask.get(task.id);

    if (!link) {
      await pushTask(admin, connection, token, task, columns, undefined);
      counters.created_in_slack += 1;
      continue;
    }

    const item = itemById.get(link.item_id);

    if (!item) {
      await admin.from("tasks").delete().eq("id", task.id);
      await admin
        .from("slack_deleted_tasks")
        .delete()
        .eq("list_id", connection.list_id as string)
        .eq("item_id", link.item_id);
      counters.deleted_in_app += 1;
      continue;
    }

    const appChanged = fingerprint(task) !== link.task_fingerprint;
    const slackChanged = itemChangedSince(item, link.synced_at);

    if (appChanged && slackChanged) counters.conflicts += 1;

    if (appChanged) {
      await pushTask(admin, connection, token, task, columns, link);
      counters.pushed += 1;
    } else if (slackChanged) {
      await pullItem(admin, connection, item, task);
      counters.pulled += 1;
    }
  }

  const { data: pendingRows } = await admin
    .from("slack_deleted_tasks")
    .select("item_id")
    .eq("user_id", connection.user_id)
    .eq("list_id", connection.list_id);
  const pendingDeletion = new Set((pendingRows ?? []).map((r) => (r as { item_id: string }).item_id));

  for (const item of items) {
    if (linkedItemIds.has(item.id) || pendingDeletion.has(item.id)) continue;
    if (await createTaskFromItem(admin, connection, item)) counters.created_in_app += 1;
  }

  return counters;
}

function cronSecretValid(req: NextApiRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return req.headers["x-cron-secret"] === expected;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const admin = adminClient();
  let connectionQuery = admin
    .from("slack_connections")
    .select("id, user_id, access_token, list_id, column_map")
    .not("list_id", "is", null);

  if (!cronSecretValid(req)) {
    const supabase = createServerSupabase(req, res);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    connectionQuery = connectionQuery.eq("user_id", user.id);
  }

  const { data, error } = await connectionQuery;
  if (error) return res.status(500).json({ error: "Nie udało się odczytać połączeń Slack." });

  const connections = (data ?? []) as ConnectionRow[];
  const results: Record<string, SyncCounters | { error: string }> = {};

  for (const connection of connections) {
    try {
      results[connection.id] = await syncConnection(admin, connection);
    } catch (err) {
      const code = (err as { slackError?: string }).slackError;
      results[connection.id] = { error: translateSlackError(code) };
    }
  }

  const failed = Object.values(results).filter((r) => "error" in r).length;
  return res.status(failed > 0 && failed === connections.length ? 502 : 200).json({
    connections: connections.length,
    results,
  });
}
