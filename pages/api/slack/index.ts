// pages/api/slack/index.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/server/tokenCrypto";
import { listColumns, translateSlackError, type SlackColumn } from "@/lib/server/slackLists";
import {
  SLACK_AUTHORIZE_URL,
  SLACK_STATE_COOKIE,
  SLACK_STATE_TTL_SECONDS,
  SLACK_USER_SCOPES,
  SLACK_MAPPABLE_TASK_FIELDS,
  type SlackMappableTaskField,
} from "@/config/slack";

interface ConnectionRow {
  id: string;
  team_name: string | null;
  list_id: string | null;
  list_title: string | null;
  column_map: Partial<Record<SlackMappableTaskField, string>>;
}

function adminClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
}

export function extractListId(input: string): string | null {
  const trimmed = input.trim();
  if (/^F[A-Z0-9]+$/i.test(trimmed)) return trimmed.toUpperCase();
  const match = /\/(F[A-Z0-9]+)/i.exec(trimmed);
  return match ? match[1].toUpperCase() : null;
}

function handleAuthUrl(res: NextApiResponse) {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: "Brak konfiguracji SLACK_CLIENT_ID." });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const nonce = randomBytes(24).toString("base64url");

  res.setHeader(
    "Set-Cookie",
    `${SLACK_STATE_COOKIE}=${nonce}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SLACK_STATE_TTL_SECONDS}`
  );

  const url = new URL(SLACK_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("user_scope", SLACK_USER_SCOPES.join(","));
  url.searchParams.set("redirect_uri", `${appUrl}/api/slack/callback`);
  url.searchParams.set("state", nonce);

  return res.status(200).json({ url: url.toString() });
}

async function loadConnection(
  admin: SupabaseClient,
  userId: string
): Promise<{ row: ConnectionRow; token: string } | null> {
  const { data } = await admin
    .from("slack_connections")
    .select("id, team_name, list_id, list_title, column_map, access_token")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const { access_token: accessToken, ...row } = data as ConnectionRow & { access_token: string };
  return { row, token: decryptToken(accessToken) };
}

function sanitizeColumnMap(input: unknown, columns: SlackColumn[]): Record<string, string> {
  const valid = new Set(columns.map((c) => c.id));
  const source = (input ?? {}) as Record<string, unknown>;
  const result: Record<string, string> = {};

  for (const field of SLACK_MAPPABLE_TASK_FIELDS) {
    const columnId = source[field];
    if (typeof columnId === "string" && valid.has(columnId)) result[field] = columnId;
  }
  return result;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const action = String(req.query.action ?? "");

  if (action === "auth-url") {
    const supabase = createServerSupabase(req, res);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    return handleAuthUrl(res);
  }

  const supabase = createServerSupabase(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const admin = adminClient();

  try {
    if (action === "status") {
      const connection = await loadConnection(admin, user.id);
      if (!connection) return res.status(200).json({ connected: false });

      let columns: SlackColumn[] = [];
      if (connection.row.list_id) {
        columns = await listColumns(connection.token, connection.row.list_id);
      }
      return res.status(200).json({ connected: true, connection: connection.row, columns });
    }

    if (action === "select-list" && req.method === "POST") {
      const listId = extractListId(String((req.body as { list?: string })?.list ?? ""));
      if (!listId) return res.status(400).json({ error: "Nieprawidłowy link lub identyfikator listy." });

      const connection = await loadConnection(admin, user.id);
      if (!connection) return res.status(400).json({ error: "Najpierw połącz konto Slack." });
      const columns = await listColumns(connection.token, listId);
      await admin
        .from("slack_connections")
        .update({ list_id: listId, column_map: {}, updated_at: new Date().toISOString() })
        .eq("id", connection.row.id);

      return res.status(200).json({ list_id: listId, columns });
    }

    if (action === "column-map" && req.method === "POST") {
      const connection = await loadConnection(admin, user.id);
      if (!connection?.row.list_id) return res.status(400).json({ error: "Najpierw wybierz listę." });

      const columns = await listColumns(connection.token, connection.row.list_id);
      const columnMap = sanitizeColumnMap((req.body as { column_map?: unknown })?.column_map, columns);
      if (!columnMap.title) {
        return res.status(400).json({ error: "Kolumna z tytułem jest wymagana." });
      }

      await admin
        .from("slack_connections")
        .update({ column_map: columnMap, updated_at: new Date().toISOString() })
        .eq("id", connection.row.id);

      return res.status(200).json({ column_map: columnMap });
    }

    if (action === "disconnect" && req.method === "POST") {
      await admin.from("slack_connections").delete().eq("user_id", user.id);
      return res.status(200).json({ connected: false });
    }

    return res.status(400).json({ error: "Nieznana akcja." });
  } catch (err) {
    const code = (err as { slackError?: string }).slackError;
    console.error("[slack/index]:", err);
    return res.status(502).json({ error: translateSlackError(code) });
  }
}
