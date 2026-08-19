// lib/server/slackSync/types.ts
// Shared types for the Slack task-list sync (split out of the former
// 717-line pages/api/slack/sync.ts).

import type { SlackMappableTaskField } from "@/config/slack";

export type ColumnMap = Partial<Record<SlackMappableTaskField, string>>;

export interface TaskRow {
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

export interface LinkRow {
  task_id: number;
  list_id: string;
  item_id: string;
  synced_at: string;
  task_fingerprint: string;
}

export interface SyncTarget {
  userId: string;
  token: string;
  slackUserId: string | null;
  listId: string;
  listTitle: string | null;
  columnMap: ColumnMap;
  isDefault: boolean;
}

export interface SyncCounters {
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
