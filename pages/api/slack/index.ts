// pages/api/slack/index.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/server/tokenCrypto";
import { listColumnsSafe, translateSlackError, type SlackColumn } from "@/lib/server/slackLists";
import {
  SLACK_AUTHORIZE_URL,
  SLACK_STATE_COOKIE,
  SLACK_STATE_TTL_SECONDS,
  SLACK_USER_SCOPES,
  SLACK_MAPPABLE_TASK_FIELDS,
  parseAssigneeEmails,
} from "@/config/slack";

interface ConnectionRow {
  id: string;
  team_id: string;
  team_name: string | null;
  access_token: string;
}

function adminClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
}

class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
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

  const secure = appUrl.startsWith("https://") ? " Secure;" : "";

  res.setHeader(
    "Set-Cookie",
    `${SLACK_STATE_COOKIE}=${nonce}; HttpOnly;${secure} SameSite=Lax; Path=/; Max-Age=${SLACK_STATE_TTL_SECONDS}`
  );

  const url = new URL(SLACK_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("user_scope", SLACK_USER_SCOPES.join(","));
  url.searchParams.set("redirect_uri", `${appUrl}/api/slack/callback`);
  url.searchParams.set("state", nonce);

  return res.status(200).json({ url: url.toString() });
}

async function loadConnections(admin: SupabaseClient, userId: string): Promise<ConnectionRow[]> {
  const { data, error } = await admin
    .from("slack_connections")
    .select("id, team_id, team_name, access_token")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[slack/index] slack_connections:", error.message);
    throw new ApiError(500, `Nie udało się odczytać połączeń Slack: ${error.message}`);
  }
  return (data ?? []) as ConnectionRow[];
}

async function tokenForConnection(
  admin: SupabaseClient,
  userId: string,
  connectionId: string
): Promise<string> {
  const connections = await loadConnections(admin, userId);
  const match = connections.find((c) => String(c.id) === String(connectionId));

  if (!match) {
    throw new ApiError(
      400,
      "To konto Slack nie istnieje już w bazie. Odłącz je i połącz ponownie."
    );
  }

  if (!match.access_token) {
    throw new ApiError(
      400,
      "Konto Slack jest zapisane bez tokenu. Odłącz je i połącz ponownie."
    );
  }

  let token: string;
  try {
    token = decryptToken(match.access_token);
  } catch (err) {
    console.error("[slack/index] decryptToken:", err);
    throw new ApiError(
      400,
      "Nie udało się odszyfrować tokenu Slack (zmieniony CALENDAR_TOKEN_ENCRYPTION_KEY?). Połącz konto ponownie."
    );
  }

  if (!token) {
    throw new ApiError(400, "Token konta Slack jest pusty. Połącz konto ponownie.");
  }
  return token;
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

async function handleStatus(admin: SupabaseClient, userId: string, res: NextApiResponse) {
  const connections = await loadConnections(admin, userId);
  const { data: lists, error } = await admin
    .from("slack_lists")
    .select(
      "id, connection_id, list_id, list_title, column_map, is_default, sync_enabled, assignee_emails"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[slack/index] slack_lists:", error.message);
    throw new ApiError(500, `Nie udało się odczytać list Slack: ${error.message}`);
  }

  return res.status(200).json({
    connections: connections.map(({ id, team_id, team_name }) => ({ id, team_id, team_name })),
    lists: lists ?? [],
  });
}

async function handleAddList(
  admin: SupabaseClient,
  userId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const body = req.body as {
    connection_id?: string;
    list?: string;
    title?: string;
    sync_enabled?: boolean;
  };
  const listId = extractListId(String(body?.list ?? ""));
  if (!listId) return res.status(400).json({ error: "Nieprawidłowy link lub identyfikator listy." });
  if (!body?.connection_id) return res.status(400).json({ error: "Wskaż konto Slack." });

  const token = await tokenForConnection(admin, userId, body.connection_id);
  const columns = await listColumnsSafe(token, listId);

  const { count } = await admin
    .from("slack_lists")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const { error } = await admin.from("slack_lists").insert({
    connection_id: body.connection_id,
    user_id: userId,
    list_id: listId,
    list_title: body.title?.trim() || listId,
    column_map: {},
    is_default: (count ?? 0) === 0,
    // domyślnie lista jest dwukierunkowa; odznaczenie wyłącza tylko pobieranie
    sync_enabled: body.sync_enabled ?? true,
  });

  if (error) {
    console.error("[slack/index] slack_lists insert:", error.message);
    const duplicate = error.code === "23505";
    return res.status(400).json({
      error: duplicate
        ? "Ta lista jest już podłączona."
        : `Nie udało się zapisać listy: ${error.message}`,
    });
  }
  return res.status(200).json({ list_id: listId, columns });
}

async function handleColumns(
  admin: SupabaseClient,
  userId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const rowId = String(req.query.list_row_id ?? "");
  const { data } = await admin
    .from("slack_lists")
    .select("connection_id, list_id")
    .eq("id", rowId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return res.status(404).json({ error: "Nie znaleziono listy." });
  const row = data as { connection_id: string; list_id: string };

  const token = await tokenForConnection(admin, userId, row.connection_id);
  return res.status(200).json({ columns: await listColumnsSafe(token, row.list_id) });
}

async function handleSaveList(
  admin: SupabaseClient,
  userId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const body = req.body as {
    list_row_id?: string;
    column_map?: unknown;
    is_default?: boolean;
    sync_enabled?: boolean;
    assignee_emails?: unknown;
  };
  if (!body?.list_row_id) return res.status(400).json({ error: "Brak identyfikatora listy." });

  const { data } = await admin
    .from("slack_lists")
    .select("connection_id, list_id")
    .eq("id", body.list_row_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return res.status(404).json({ error: "Nie znaleziono listy." });

  const row = data as { connection_id: string; list_id: string };
  const token = await tokenForConnection(admin, userId, row.connection_id);
  const columns = await listColumnsSafe(token, row.list_id);
  const columnMap = sanitizeColumnMap(body.column_map, columns);
  if (!columnMap.title) return res.status(400).json({ error: "Kolumna z tytułem jest wymagana." });

  if (body.is_default) {
    await admin.from("slack_lists").update({ is_default: false }).eq("user_id", userId);
  }

  await admin
    .from("slack_lists")
    .update({
      column_map: columnMap,
      is_default: Boolean(body.is_default),
      sync_enabled: body.sync_enabled ?? true,
      assignee_emails: parseAssigneeEmails(
        Array.isArray(body.assignee_emails)
          ? body.assignee_emails.join(",")
          : (typeof body.assignee_emails === "string" ? body.assignee_emails : "")
      ),
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.list_row_id);

  return res.status(200).json({ column_map: columnMap });
}

async function handleSetTarget(admin: SupabaseClient, userId: string, req: NextApiRequest, res: NextApiResponse) {
  const body = req.body as { task_id?: number; list_id?: string };
  if (!body?.task_id) return res.status(400).json({ error: "Brak identyfikatora zadania." });

  if (!body.list_id) {
    const { error } = await admin
      .from("slack_task_targets")
      .delete()
      .eq("task_id", body.task_id)
      .eq("user_id", userId);
    if (error) {
      throw new ApiError(500, `Nie udało się wyczyścić listy zadania: ${error.message}`);
    }
    return res.status(200).json({ cleared: true });
  }

  const { data: owned } = await admin
    .from("slack_lists")
    .select("list_id")
    .eq("user_id", userId)
    .eq("list_id", body.list_id)
    .maybeSingle();
  if (!owned) return res.status(400).json({ error: "Nie znaleziono tej listy." });

  const targetRow = { task_id: body.task_id, user_id: userId, list_id: body.list_id };
  const { error: upsertError } = await admin
    .from("slack_task_targets")
    .upsert(targetRow, { onConflict: "task_id" });

  if (upsertError) {
    if (upsertError.code !== "42P10") {
      console.error("[slack/index] slack_task_targets upsert:", upsertError.message);
      throw new ApiError(500, `Nie udało się zapisać listy zadania: ${upsertError.message}`);
    }

    await admin.from("slack_task_targets").delete().eq("task_id", body.task_id);
    const { error: insertError } = await admin.from("slack_task_targets").insert(targetRow);
    if (insertError) {
      console.error("[slack/index] slack_task_targets insert:", insertError.message);
      throw new ApiError(500, `Nie udało się zapisać listy zadania: ${insertError.message}`);
    }
  }
  return res.status(200).json({ list_id: body.list_id });
}

async function handleRemoveList(admin: SupabaseClient, userId: string, req: NextApiRequest, res: NextApiResponse) {
  const rowId = String((req.body as { list_row_id?: string })?.list_row_id ?? "");
  await admin.from("slack_lists").delete().eq("id", rowId).eq("user_id", userId);
  return res.status(200).json({ removed: true });
}

async function handleDisconnect(admin: SupabaseClient, userId: string, req: NextApiRequest, res: NextApiResponse) {
  const connectionId = String((req.body as { connection_id?: string })?.connection_id ?? "");
  await admin
    .from("slack_connections")
    .delete()
    .eq("id", connectionId)
    .eq("user_id", userId);
  return res.status(200).json({ removed: true });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const action = String(req.query.action ?? "");

  const supabase = createServerSupabase(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  if (action === "auth-url") return handleAuthUrl(res);

  const admin = adminClient();

  try {
    if (action === "status") return await handleStatus(admin, user.id, res);
    if (action === "columns") return await handleColumns(admin, user.id, req, res);

    if (req.method === "POST") {
      if (action === "add-list") return await handleAddList(admin, user.id, req, res);
      if (action === "save-list") return await handleSaveList(admin, user.id, req, res);
      if (action === "set-target") return await handleSetTarget(admin, user.id, req, res);
      if (action === "remove-list") return await handleRemoveList(admin, user.id, req, res);
      if (action === "disconnect") return await handleDisconnect(admin, user.id, req, res);
    }

    return res.status(400).json({ error: "Nieznana akcja." });
  } catch (err) {
    if (err instanceof ApiError) {
      return res.status(err.status).json({ error: err.message });
    }
    const code = (err as { slackError?: string }).slackError;
    console.error("[slack/index]:", err);
    return res.status(502).json({ error: translateSlackError(code) });
  }
}