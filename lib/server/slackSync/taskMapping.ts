// lib/server/slackSync/taskMapping.ts

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
  SLACK_IMPORT_HORIZON_MONTHS,
  SLACK_MAPPABLE_TASK_FIELDS,
  SLACK_PULL_EXCLUDED_FIELDS,
  normalizeTaskStatus,
  type SlackMappableTaskField,
} from "@/config/slack";
import type { ColumnMap, SyncTarget, TaskRow } from "./types";

/**
 * Wbudowane kolumny list zadań Slacka („Due Date” – todo_due_date, „Completed” –
 * todo_completed) są mapowane automatycznie, gdy użytkownik nie przypisał
 * tych pól ręcznie. Wcześniej bez ręcznego mapowania daty w ogóle się nie kopiowały.
 */
const BUILT_IN_COLUMNS: Partial<Record<SlackMappableTaskField, string>> = {
  due_date: "todo_due_date",
  status: "todo_completed",
};

export function withBuiltInColumns(columnMap: ColumnMap, columns: SlackColumn[]): ColumnMap {
  const result: ColumnMap = { ...columnMap };
  for (const [field, type] of Object.entries(BUILT_IN_COLUMNS) as [SlackMappableTaskField, string][]) {
    if (result[field]) continue;
    const column = columns.find((c) => c.type === type || c.key === type);
    if (column) result[field] = column.id;
  }
  return result;
}

/**
 * Pola puste w aplikacji, a wypełnione w Slacku (np. termin dodany do mapowania
 * po pierwszym imporcie). Uzupełniamy je także wtedy, gdy pozycja w Slacku się
 * nie zmieniła – nie nadpisuje to niczego, co jest już w aplikacji.
 */
export function missingFieldsFromItem(
  task: TaskRow,
  item: SlackItem,
  columnMap: ColumnMap,
  columns: SlackColumn[]
): Partial<TaskRow> {
  const patch = itemToTaskPatch(item, columnMap, columns) as Record<string, unknown>;
  const missing: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(patch)) {
    const current = (task as unknown as Record<string, unknown>)[field];
    if ((current === null || current === undefined || current === "") && value !== null && value !== "") {
      missing[field] = value;
    }
  }
  return missing as Partial<TaskRow>;
}

/** „YYYY-MM-DD” + n miesięcy; 31 stycznia + 1 miesiąc = ostatni dzień lutego. */
function addMonthsClamped(day: string, months: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

/** Dzisiejsza data w Polsce („YYYY-MM-DD”) – serwer działa w UTC. */
export function todayInPoland(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(now);
}

/**
 * Czy pozycję ze Slacka importować jako nowe zadanie: termin od `today` do
 * `today` + SLACK_IMPORT_HORIZON_MONTHS (włącznie). Bez terminu – nie.
 */
export function isWithinImportHorizon(
  item: SlackItem,
  columnMap: ColumnMap,
  columns: SlackColumn[],
  today: string
): boolean {
  const due = itemToTaskPatch(item, columnMap, columns).due_date;
  if (typeof due !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(due)) return false;
  const day = due.slice(0, 10);
  return day >= today && day <= addMonthsClamped(today, SLACK_IMPORT_HORIZON_MONTHS);
}

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

function indexFieldsByColumn(fields: SlackItemField[] | undefined): Map<string, SlackItemField> {
  const byColumn = new Map<string, SlackItemField>();
  for (const cell of fields ?? []) {
    const id = cell.column_id ?? cell.key;
    if (id && !byColumn.has(id)) byColumn.set(id, cell);
  }
  return byColumn;
}

function applyPatchValue(
  patch: Record<string, unknown>,
  field: SlackMappableTaskField,
  cell: SlackItemField,
  column: SlackColumn | undefined
): void {
  const raw = readFieldValue(cell, column);
  if (raw === null) return;

  if (field === "priority") {
    patch[field] = Number(raw) || null;
  } else if (field === "status") {
    const status = normalizeTaskStatus(raw);
    if (status !== null) patch[field] = status;
  } else {
    patch[field] = raw;
  }
}

export function itemToTaskPatch(item: SlackItem, columnMap: ColumnMap, columns: SlackColumn[]): Partial<TaskRow> {
  const byColumn = indexFieldsByColumn(item.fields);
  const columnById = new Map(columns.map((c) => [c.id, c]));
  const patch: Record<string, string | number | null> = {};

  for (const field of SLACK_MAPPABLE_TASK_FIELDS) {
    if (SLACK_PULL_EXCLUDED_FIELDS.includes(field)) continue;
    const columnId = columnMap[field];
    if (!columnId) continue;
    const cell = byColumn.get(columnId);
    if (!cell) continue;

    applyPatchValue(patch, field, cell, columnById.get(columnId));
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
