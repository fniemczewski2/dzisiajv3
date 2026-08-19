// lib/server/slackSync/push.ts
// App -> Slack direction of the sync (split out of the former 717-line
// pages/api/slack/sync.ts).

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createItem,
  updateItem,
  isMissingItemError,
  type SlackColumn,
  type SlackFieldValue,
} from "@/lib/server/slackLists";
import type { LinkRow, SyncTarget, TaskRow } from "./types";
import { buildFields, fingerprint } from "./taskMapping";

export async function touchLink(
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

export function isFieldRejection(err: unknown): boolean {
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

export async function pushTask(
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
