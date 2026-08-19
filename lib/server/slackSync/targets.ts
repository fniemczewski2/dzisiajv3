// lib/server/slackSync/targets.ts
// Loads the set of Slack lists (sync targets) and app tasks a sync run needs
// (split out of the former 717-line pages/api/slack/sync.ts).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { decryptToken } from "@/lib/server/tokenCrypto";
import { SLACK_TASK_CATEGORY } from "@/config/slack";
import type { ColumnMap, SyncTarget, TaskRow } from "./types";

export function adminClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
}

interface SlackListRow {
  user_id: string;
  connection_id: string;
  list_id: string;
  list_title: string | null;
  column_map: ColumnMap;
  is_default: boolean;
}

export async function loadTargets(admin: SupabaseClient, userId?: string): Promise<SyncTarget[]> {
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

export async function loadTasks(admin: SupabaseClient, userId: string): Promise<TaskRow[]> {
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
