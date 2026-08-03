// pages/api/slack/sync.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { verifyCronRequest } from "@/lib/server/cronAuth";
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

type ColumnMap = Partial<Record<SlackMappableTaskField, string>>;

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

interface SyncTarget {
  userId: string;
  token: string;
  listId: string;
  listTitle: string | null;
  columnMap: ColumnMap;
  isDefault: boolean;
}

interface SyncCounters {
  list_id: string;
  list_title: string | null;
  pushed: number;
  pulled: number;
  created_in_slack: number;
  created_in_app: number;
  deleted_in_slack: number;
  deleted_in_app: number;
  conflicts: number;
}

function adminClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
}

function fingerprint(task: TaskRow): string {
  return SLACK_MAPPABLE_TASK_FIELDS.map((field) => String(task[field] ?? "")).join("\u0001");
}

function buildFields(task: TaskRow, columnMap: ColumnMap, columns: SlackColumn[]): SlackFieldValue[] {
  const byId = new Map(columns.map((c) => [c.id, c]));
  const fields: SlackFieldValue[] = [];

  for (const field of SLACK_MAPPABLE_TASK_FIELDS) {
    const columnId = columnMap[field];
    if (!columnId) continue;
    const column = byId.get(columnId);
    if (!column) continue;
    const value = buildFieldValue(column, task[field] ?? null);
    if (value) fields.push(value);
  }
  return fields;
}

function itemToTaskPatch(item: SlackItem, columnMap: ColumnMap): Partial<TaskRow> {
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
  return Number(item.updated_timestamp ?? 0) * 1000 > new Date(syncedAt).getTime();
}

async function touchLink(
  admin: SupabaseClient,
  target: SyncTarget,
  taskId: number,
  task: TaskRow
): Promise<void> {
  await admin
    .from("slack_task_links")
    .update({ task_fingerprint: fingerprint(task), synced_at: new Date().toISOString() })
    .eq("task_id", taskId)
    .eq("list_id", target.listId);
}

async function pushTask(
  admin: SupabaseClient,
  target: SyncTarget,
  task: TaskRow,
  columns: SlackColumn[],
  link: LinkRow | undefined
): Promise<void> {
  const fields = buildFields(task, target.columnMap, columns);

  if (link) {
    await updateItem(target.token, target.listId, link.item_id, fields);
    await touchLink(admin, target, task.id, task);
    return;
  }

  const itemId = await createItem(target.token, target.listId, fields);
  await admin.from("slack_task_links").insert({
    task_id: task.id,
    user_id: target.userId,
    list_id: target.listId,
    item_id: itemId,
    task_fingerprint: fingerprint(task),
    synced_at: new Date().toISOString(),
  });
}

async function pullItem(
  admin: SupabaseClient,
  target: SyncTarget,
  item: SlackItem,
  task: TaskRow
): Promise<void> {
  const patch = itemToTaskPatch(item, target.columnMap);
  if (Object.keys(patch).length === 0) return;

  await admin.from("tasks").update(patch).eq("id", task.id);
  await touchLink(admin, target, task.id, { ...task, ...patch } as TaskRow);
}

async function createTaskFromItem(
  admin: SupabaseClient,
  target: SyncTarget,
  item: SlackItem
): Promise<boolean> {
  const patch = itemToTaskPatch(item, target.columnMap);
  if (!patch.title) return false;

  const { data, error } = await admin
    .from("tasks")
    .insert({
      ...patch,
      user_id: target.userId,
      category: SLACK_TASK_CATEGORY,
      status: patch.status ?? "pending",
    })
    .select("id")
    .single();

  if (error || !data) return false;

  await admin.from("slack_task_links").insert({
    task_id: (data as { id: number }).id,
    user_id: target.userId,
    list_id: target.listId,
    item_id: item.id,
    task_fingerprint: "",
    synced_at: new Date().toISOString(),
  });
  return true;
}

async function applyAppDeletions(admin: SupabaseClient, target: SyncTarget): Promise<number> {
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
      if ((err as { slackError?: string }).slackError !== "item_not_found") throw err;
    }
    await admin.from("slack_deleted_tasks").delete().eq("id", tombstone.id);
  }
  return removed;
}

async function syncList(
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
    deleted_in_app: 0,
    conflicts: 0,
  };

  const { items, columns } = await listItems(target.token, target.listId);
  counters.deleted_in_slack = await applyAppDeletions(admin, target);

  const { data: linkRows } = await admin
    .from("slack_task_links")
    .select("task_id, list_id, item_id, synced_at, task_fingerprint")
    .eq("user_id", target.userId)
    .eq("list_id", target.listId);

  const links = (linkRows ?? []) as LinkRow[];
  const linkByTask = new Map(links.map((l) => [l.task_id, l]));
  const itemById = new Map(items.map((i) => [i.id, i]));
  const linkedItemIds = new Set(links.map((l) => l.item_id));

  for (const task of tasks) {
    const link = linkByTask.get(task.id);

    if (!link) {
      if (linkedAnywhere.has(task.id)) continue;
      // Zadanie ze wskazana lista idzie tam; pozostale na liste domyslna.
      // Bez tego rozgraniczenia zadanie duplikowaloby sie na kazdej liscie.
      const chosenList = targetListByTask.get(task.id);
      const belongsHere = chosenList ? chosenList === target.listId : target.isDefault;
      if (!belongsHere) continue;
      await pushTask(admin, target, task, columns, undefined);
      linkedAnywhere.add(task.id);
      counters.created_in_slack += 1;
      continue;
    }

    const item = itemById.get(link.item_id);

    if (!item) {
      await admin.from("tasks").delete().eq("id", task.id);
      await admin
        .from("slack_deleted_tasks")
        .delete()
        .eq("list_id", target.listId)
        .eq("item_id", link.item_id);
      counters.deleted_in_app += 1;
      continue;
    }

    const appChanged = fingerprint(task) !== link.task_fingerprint;
    const slackChanged = itemChangedSince(item, link.synced_at);
    if (appChanged && slackChanged) counters.conflicts += 1;

    if (appChanged) {
      await pushTask(admin, target, task, columns, link);
      counters.pushed += 1;
    } else if (slackChanged) {
      await pullItem(admin, target, item, task);
      counters.pulled += 1;
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
    if (await createTaskFromItem(admin, target, item)) counters.created_in_app += 1;
  }

  return counters;
}

interface SlackListRow {
  user_id: string;
  list_id: string;
  list_title: string | null;
  column_map: ColumnMap;
  is_default: boolean;
  slack_connections: { access_token: string } | { access_token: string }[] | null;
}

async function loadTargets(admin: SupabaseClient, userId?: string): Promise<SyncTarget[]> {
  let query = admin
    .from("slack_lists")
    .select("user_id, list_id, list_title, column_map, is_default, slack_connections(access_token)");
  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as SlackListRow[]).flatMap((row) => {
    const connection = Array.isArray(row.slack_connections)
      ? row.slack_connections[0]
      : row.slack_connections;
    // Lista bez zmapowanego tytulu nie ma czego synchronizowac.
    if (!connection?.access_token || !row.column_map?.title) return [];

    return [
      {
        userId: row.user_id,
        token: decryptToken(connection.access_token),
        listId: row.list_id,
        listTitle: row.list_title,
        columnMap: row.column_map,
        isDefault: row.is_default,
      },
    ];
  });
}

/** Vercel Cron potrafi wywolac funkcje dluzej niz domyslny limit - synchronizacja
 * kilku list to kilkanascie wywolan do Slacka. */
export const config = { maxDuration: 60 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const isCron = verifyCronRequest(req);

  // Vercel Cron wysyla GET; wywolania z aplikacji ida POST-em.
  const allowedMethod = isCron ? req.method === "GET" || req.method === "POST" : req.method === "POST";
  if (!allowedMethod) return res.status(405).json({ error: "Method Not Allowed" });

  const admin = adminClient();
  let scopedUserId: string | undefined;

  if (!isCron) {
    const supabase = createServerSupabase(req, res);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    scopedUserId = user.id;
  }

  try {
    const targets = await loadTargets(admin, scopedUserId);
    const byUser = new Map<string, SyncTarget[]>();
    for (const target of targets) {
      byUser.set(target.userId, [...(byUser.get(target.userId) ?? []), target]);
    }

    const results: (SyncCounters | { list_id: string; error: string })[] = [];

    for (const [userId, userTargets] of byUser) {
      const { data: taskRows } = await admin
        .from("tasks")
        .select("id, title, description, due_date, category, priority, status, user_id")
        .eq("user_id", userId);
      const tasks = (taskRows ?? []) as TaskRow[];

      const { data: allLinks } = await admin
        .from("slack_task_links")
        .select("task_id")
        .eq("user_id", userId);
      const linkedAnywhere = new Set(
        (allLinks ?? []).map((l) => (l as { task_id: number }).task_id)
      );

      const { data: targetRows } = await admin
        .from("slack_task_targets")
        .select("task_id, list_id")
        .eq("user_id", userId);
      const targetListByTask = new Map(
        (targetRows ?? []).map((r) => {
          const row = r as { task_id: number; list_id: string };
          return [row.task_id, row.list_id] as const;
        })
      );

      for (const target of userTargets) {
        try {
          results.push(await syncList(admin, target, tasks, linkedAnywhere, targetListByTask));
        } catch (err) {
          const code = (err as { slackError?: string }).slackError;
          results.push({ list_id: target.listId, error: translateSlackError(code) });
        }
      }
    }

    const failed = results.filter((r) => "error" in r).length;
    return res
      .status(results.length > 0 && failed === results.length ? 502 : 200)
      .json({ lists: results.length, results });
  } catch (err) {
    console.error("[slack/sync]:", err);
    return res.status(500).json({ error: "Synchronizacja nie powiodła się." });
  }
}