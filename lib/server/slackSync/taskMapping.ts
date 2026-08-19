// lib/server/slackSync/taskMapping.ts
// Task <-> Slack-item field mapping and push/pull direction resolution
// (split out of the former 717-line pages/api/slack/sync.ts).

import {
  buildFieldValue,
  buildAssigneeValue,
  findAssigneeColumn,
  readFieldValue,
  type SlackColumn,
  type SlackItem,
  type SlackItemField,
  type SlackFieldValue,
} from "@/lib/server/slackLists";
import {
  SLACK_MAPPABLE_TASK_FIELDS,
  SLACK_PULL_EXCLUDED_FIELDS,
  normalizeTaskStatus,
} from "@/config/slack";
import type { ColumnMap, SyncTarget, TaskRow } from "./types";

export function fingerprint(task: TaskRow): string {
  return SLACK_MAPPABLE_TASK_FIELDS.map((field) => String(task[field] ?? "")).join("\u0001");
}

export function buildFields(
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

export function itemToTaskPatch(
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

export function itemChangedSince(item: SlackItem, syncedAt: string): boolean {
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
