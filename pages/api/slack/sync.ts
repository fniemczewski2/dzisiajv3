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
  itemExists,
  isMissingItemError,
  buildFieldValue,
  buildAssigneeValue,
  findAssigneeColumn,
  readFieldValue,
  translateSlackError,
  type SlackColumn,
  type SlackItem,
  type SlackItemField,
  type SlackFieldValue,
} from "@/lib/server/slackLists";
import {
  SLACK_MAPPABLE_TASK_FIELDS,
  SLACK_TASK_CATEGORY,
  SLACK_PULL_EXCLUDED_FIELDS,
  DEFAULT_TASK_STATUS,
  normalizeTaskStatus,
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
  updated_at?: string | null;
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
  slackUserId: string | null;
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
  recreated_in_slack: number;
  conflicts: number;
  failed: number;
  first_error: string | null;
}

function adminClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
}

function fingerprint(task: TaskRow): string {
  return SLACK_MAPPABLE_TASK_FIELDS.map((field) => String(task[field] ?? "")).join("\u0001");
}

function buildFields(
  task: TaskRow,
  target: SyncTarget,
  columns: SlackColumn[],
  options: { withAssignee?: boolean } = {}
): SlackFieldValue[] {
  const byId = new Map(columns.map((c) => [c.id, c]));
  const fields: SlackFieldValue[] = [];
  const used = new Set<string>();

  for (const field of SLACK_MAPPABLE_TASK_FIELDS) {
    const columnId = target.columnMap[field];
    if (!columnId) continue;
    const column = byId.get(columnId);
    if (!column) continue;
    const value = buildFieldValue(column, task[field] ?? null);
    if (value) {
      fields.push(value);
      used.add(column.id);
    }
  }

  if (options.withAssignee) {
    const assigneeColumn = findAssigneeColumn(columns);
    if (assigneeColumn && !used.has(assigneeColumn.id)) {
      const value = buildAssigneeValue(assigneeColumn, target.slackUserId);
      if (value) fields.push(value);
    }
  }
  return fields;
}

function itemToTaskPatch(
  item: SlackItem,
  columnMap: ColumnMap,
  columns: SlackColumn[]
): Partial<TaskRow> {
  const byColumn = new Map<string, SlackItemField>();
  for (const cell of item.fields ?? []) {
    const id = cell.column_id ?? cell.key;
    if (id && !byColumn.has(id)) byColumn.set(id, cell);
  }
  const columnById = new Map(columns.map((c) => [c.id, c]));
  const patch: Record<string, string | number | null> = {};

  for (const field of SLACK_MAPPABLE_TASK_FIELDS) {
    if (SLACK_PULL_EXCLUDED_FIELDS.includes(field)) continue;
    const columnId = columnMap[field];
    if (!columnId) continue;
    const cell = byColumn.get(columnId);
    if (!cell) continue;
    const raw = readFieldValue(cell, columnById.get(columnId));
    if (raw === null) continue;

    if (field === "priority") {
      patch[field] = Number(raw) || null;
    } else if (field === "status") {
      const normalized = normalizeTaskStatus(raw);
      if (normalized) patch[field] = normalized;
    } else {
      patch[field] = raw;
    }
  }
  return patch as Partial<TaskRow>;
}

function itemChangedSince(item: SlackItem, syncedAt: string): boolean {
  const changedAt = itemUpdatedAt(item);
  return changedAt !== null && changedAt > new Date(syncedAt).getTime();
}

export function taskUpdatedAt(task: Pick<TaskRow, "updated_at">): number | null {
  if (!task.updated_at) return null;
  const ms = new Date(task.updated_at).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function itemUpdatedAt(item: Pick<SlackItem, "updated_timestamp">): number | null {
  const seconds = Number(item.updated_timestamp ?? 0);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null;
}

export type SyncDirection = "push" | "pull" | "none";

export function resolveDirection(input: {
  appChanged: boolean;
  slackChanged: boolean;
  taskUpdatedAt: number | null;
  itemUpdatedAt: number | null;
}): SyncDirection {
  const { appChanged, slackChanged } = input;

  if (!appChanged && !slackChanged) return "none";
  if (appChanged && !slackChanged) return "push";
  if (!appChanged && slackChanged) return "pull";

  if (input.taskUpdatedAt !== null && input.itemUpdatedAt !== null) {
    return input.taskUpdatedAt > input.itemUpdatedAt ? "push" : "pull";
  }
  return "pull";
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

const FIELD_REJECTION_ERRORS = new Set([
  "invalid_input_type",
  "invalid_option_id",
  "invalid_column_id",
  "uneditable_column",
  "over_cell_fields_limit",
  "invalid_blocks",
  "invalid_text_block",
  "invalid_date",
]);

function isFieldRejection(err: unknown): boolean {
  const code = (err as { slackError?: string }).slackError;
  return code !== undefined && FIELD_REJECTION_ERRORS.has(code);
}

function titleOnly(fields: SlackFieldValue[], target: SyncTarget): SlackFieldValue[] {
  return fields.filter((field) => field.column_id === target.columnMap.title);
}

async function updateFieldsIndividually(
  target: SyncTarget,
  itemId: string,
  fields: SlackFieldValue[],
  context: string
): Promise<void> {
  for (const field of fields) {
    try {
      await updateItem(target.token, target.listId, itemId, [field]);
    } catch (err) {
      if (!isFieldRejection(err)) throw err;
      console.warn(
        `[slack/sync] ${context}: Slack odrzucił kolumnę ${field.column_id} ` +
          `(${Object.keys(field).filter((k) => k !== "column_id").join(", ")}): ` +
          `${(err as Error).message}`
      );
    }
  }
}

async function pushTask(
  admin: SupabaseClient,
  target: SyncTarget,
  task: TaskRow,
  columns: SlackColumn[],
  link: LinkRow | undefined
): Promise<void> {
  if (link) {
    const updateFields = buildFields(task, target, columns);
    try {
      await updateItem(target.token, target.listId, link.item_id, updateFields);
      await touchLink(admin, target, task.id, task);
      return;
    } catch (err) {
      if (isFieldRejection(err)) {
        await updateFieldsIndividually(
          target,
          link.item_id,
          updateFields,
          `zadanie ${task.id}`
        );
        await touchLink(admin, target, task.id, task);
        return;
      }
      if (!isMissingItemError(err)) throw err;
      await admin
        .from("slack_task_links")
        .delete()
        .eq("task_id", task.id)
        .eq("list_id", target.listId);
    }
  }

  const fields = buildFields(task, target, columns, { withAssignee: true });

  let itemId: string;
  try {
    itemId = await createItem(target.token, target.listId, fields);
  } catch (err) {
    if (!isFieldRejection(err)) throw err;


    const minimal = titleOnly(fields, target);
    console.warn(
      `[slack/sync] zadanie ${task.id}: Slack odrzucił komplet pól ` +
        `(${(err as Error).message}), dosyłam kolumny pojedynczo.`
    );
    itemId = await createItem(target.token, target.listId, minimal);

    const rest = fields.filter((f) => f.column_id !== target.columnMap.title);
    await updateFieldsIndividually(target, itemId, rest, `zadanie ${task.id}`);
  }
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
  task: TaskRow,
  columns: SlackColumn[]
): Promise<void> {
  const patch = itemToTaskPatch(item, target.columnMap, columns);
  if (Object.keys(patch).length === 0) return;

  await admin.from("tasks").update(patch).eq("id", task.id);
  await touchLink(admin, target, task.id, { ...task, ...patch } as TaskRow);
}

async function createTaskFromItem(
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
      // pozycja mogła zostać już usunięta ręcznie w Slacku - to nie jest błąd
      if (!isMissingItemError(err)) throw err;
    }
    await admin.from("slack_deleted_tasks").delete().eq("id", tombstone.id);
  }
  return removed;
}

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

  const recordFailure = (err: unknown, what: string) => {
    counters.failed += 1;
    const message = err instanceof Error ? err.message : String(err);
    counters.first_error ??= `${what}: ${message}`;
    console.error(`[slack/sync] ${what}:`, message);
  };

  const syncOneTask = async (task: TaskRow): Promise<void> => {
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
  };

  for (const task of tasks) {
    try {
      await syncOneTask(task);
    } catch (err) {
      if (isFatalSlackError(err)) throw err;
      recordFailure(err, `zadanie ${task.id}`);
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
      recordFailure(err, `pozycja ${item.id}`);
    }
  }

  return counters;
}

interface SlackListRow {
  user_id: string;
  connection_id: string;
  list_id: string;
  list_title: string | null;
  column_map: ColumnMap;
  is_default: boolean;
}

async function loadTargets(admin: SupabaseClient, userId?: string): Promise<SyncTarget[]> {
  let listQuery = admin
    .from("slack_lists")
    .select("user_id, connection_id, list_id, list_title, column_map, is_default");
  if (userId) listQuery = listQuery.eq("user_id", userId);

  const { data: listData, error: listError } = await listQuery;
  if (listError) throw new Error(`slack_lists: ${listError.message}`);

  const lists = (listData ?? []) as SlackListRow[];
  if (lists.length === 0) return [];

  let connectionQuery = admin
    .from("slack_connections")
    .select("id, access_token, slack_user_id");
  if (userId) connectionQuery = connectionQuery.eq("user_id", userId);

  const { data: connectionData, error: connectionError } = await connectionQuery;
  if (connectionError) throw new Error(`slack_connections: ${connectionError.message}`);

  const connectionsById = new Map(
    (connectionData ?? []).map((row) => {
      const connection = row as {
        id: string;
        access_token: string;
        slack_user_id: string | null;
      };
      return [String(connection.id), connection] as const;
    })
  );

  return lists.flatMap((row) => {
    const connection = connectionsById.get(String(row.connection_id));
    if (!connection?.access_token || !row.column_map?.title) return [];

    let token: string;
    try {
      token = decryptToken(connection.access_token);
    } catch (err) {
      console.error(`[slack/sync] nie udało się odszyfrować tokenu listy ${row.list_id}:`, err);
      return [];
    }
    if (!token) return [];

    return [
      {
        userId: row.user_id,
        token,
        slackUserId: connection.slack_user_id ?? null,
        listId: row.list_id,
        listTitle: row.list_title,
        columnMap: row.column_map,
        isDefault: row.is_default,
      },
    ];
  });
}

const TASK_COLUMNS = "id, title, description, due_date, category, priority, status, user_id";
async function loadTasks(admin: SupabaseClient, userId: string): Promise<TaskRow[]> {
  const withTimestamp = await admin
    .from("tasks")
    .select(`${TASK_COLUMNS}, updated_at`)
    .eq("user_id", userId)
    .eq("category", SLACK_TASK_CATEGORY);

  if (!withTimestamp.error) return (withTimestamp.data ?? []) as TaskRow[];
  if (withTimestamp.error.code !== "42703") {
    throw new Error(`tasks: ${withTimestamp.error.message}`);
  }

  console.warn(
    "[slack/sync] tabela tasks nie ma kolumny updated_at - w konfliktach wygrywa wersja ze Slacka"
  );

  const fallback = await admin
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("user_id", userId)
    .eq("category", SLACK_TASK_CATEGORY);
  if (fallback.error) throw new Error(`tasks: ${fallback.error.message}`);
  return (fallback.data ?? []) as TaskRow[];
}

export const config = { maxDuration: 60 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const isCron = verifyCronRequest(req);

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
      if (scopedUserId && userId !== scopedUserId) continue;

      const tasks = await loadTasks(admin, userId);

      const listIds = userTargets.map((t) => t.listId);
      const { data: allLinks, error: allLinksError } = await admin
        .from("slack_task_links")
        .select("task_id")
        .in("list_id", listIds);
      if (allLinksError) throw new Error(`slack_task_links: ${allLinksError.message}`);
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
          // Błędy spoza Slacka (baza, sieć) mają własny komunikat - nie chowamy
          // ich za ogólnym "Slack odrzucił żądanie."
          const code = (err as { slackError?: string }).slackError;
          const message = code
            ? translateSlackError(code)
            : err instanceof Error
              ? err.message
              : String(err);
          console.error(`[slack/sync] lista ${target.listId}:`, err);
          results.push({ list_id: target.listId, error: message });
        }
      }
    }

    const failed = results.filter((r) => "error" in r).length;
    return res
      .status(results.length > 0 && failed === results.length ? 502 : 200)
      .json({ lists: results.length, results });
  } catch (err) {
    console.error("[slack/sync]:", err);
    const detail = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Synchronizacja nie powiodła się: ${detail}` });
  }
}