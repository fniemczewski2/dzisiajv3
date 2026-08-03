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

/** Slack nie udostepnia metody listujacej Listy, wiec uzytkownik podaje link
 * albo identyfikator. Z linku wyciagamy identyfikator zaczynajacy sie od "F". */
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

async function loadConnections(admin: SupabaseClient, userId: string): Promise<ConnectionRow[]> {
  const { data } = await admin
    .from("slack_connections")
    .select("id, team_id, team_name, access_token")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return (data ?? []) as ConnectionRow[];
}

async function tokenForConnection(
  admin: SupabaseClient,
  userId: string,
  connectionId: string
): Promise<string | null> {
  const connections = await loadConnections(admin, userId);
  const match = connections.find((c) => c.id === connectionId);
  return match ? decryptToken(match.access_token) : null;
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
  const { data: lists } = await admin
    .from("slack_lists")
    .select("id, connection_id, list_id, list_title, column_map, is_default")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

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
  const body = req.body as { connection_id?: string; list?: string; title?: string };
  const listId = extractListId(String(body?.list ?? ""));
  if (!listId) return res.status(400).json({ error: "Nieprawidłowy link lub identyfikator listy." });
  if (!body?.connection_id) return res.status(400).json({ error: "Wskaż konto Slack." });

  const token = await tokenForConnection(admin, userId, body.connection_id);
  if (!token) return res.status(400).json({ error: "Nie znaleziono tego konta Slack." });

  // Weryfikujemy dostep do listy, zanim ja zapiszemy.
  const columns = await listColumns(token, listId);

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
  });

  if (error) return res.status(400).json({ error: "Ta lista jest już podłączona." });
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
  if (!token) return res.status(400).json({ error: "Nie znaleziono konta Slack." });

  return res.status(200).json({ columns: await listColumns(token, row.list_id) });
}

async function handleSaveList(
  admin: SupabaseClient,
  userId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const body = req.body as { list_row_id?: string; column_map?: unknown; is_default?: boolean };
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
  if (!token) return res.status(400).json({ error: "Nie znaleziono konta Slack." });

  const columns = await listColumns(token, row.list_id);
  const columnMap = sanitizeColumnMap(body.column_map, columns);
  if (!columnMap.title) return res.status(400).json({ error: "Kolumna z tytułem jest wymagana." });

  // Najwyzej jedna lista domyslna na uzytkownika (pilnuje tego takze indeks).
  if (body.is_default) {
    await admin.from("slack_lists").update({ is_default: false }).eq("user_id", userId);
  }

  await admin
    .from("slack_lists")
    .update({
      column_map: columnMap,
      is_default: Boolean(body.is_default),
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.list_row_id);

  return res.status(200).json({ column_map: columnMap });
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

      if (action === "set-target") {
        const body = req.body as { task_id?: number; list_id?: string };
        if (!body?.task_id) return res.status(400).json({ error: "Brak identyfikatora zadania." });

        if (!body.list_id) {
          await admin
            .from("slack_task_targets")
            .delete()
            .eq("task_id", body.task_id)
            .eq("user_id", user.id);
          return res.status(200).json({ cleared: true });
        }

        // Lista musi nalezec do tego uzytkownika.
        const { data: owned } = await admin
          .from("slack_lists")
          .select("list_id")
          .eq("user_id", user.id)
          .eq("list_id", body.list_id)
          .maybeSingle();
        if (!owned) return res.status(400).json({ error: "Nie znaleziono tej listy." });

        await admin
          .from("slack_task_targets")
          .upsert(
            { task_id: body.task_id, user_id: user.id, list_id: body.list_id },
            { onConflict: "task_id" }
          );
        return res.status(200).json({ list_id: body.list_id });
      }

      if (action === "remove-list") {
        const rowId = String((req.body as { list_row_id?: string })?.list_row_id ?? "");
        await admin.from("slack_lists").delete().eq("id", rowId).eq("user_id", user.id);
        return res.status(200).json({ removed: true });
      }

      if (action === "disconnect") {
        const connectionId = String((req.body as { connection_id?: string })?.connection_id ?? "");
        await admin
          .from("slack_connections")
          .delete()
          .eq("id", connectionId)
          .eq("user_id", user.id);
        return res.status(200).json({ removed: true });
      }
    }

    return res.status(400).json({ error: "Nieznana akcja." });
  } catch (err) {
    const code = (err as { slackError?: string }).slackError;
    console.error("[slack/index]:", err);
    return res.status(502).json({ error: translateSlackError(code) });
  }
}