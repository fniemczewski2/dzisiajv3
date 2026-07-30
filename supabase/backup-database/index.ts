// supabase/functions/backup-database/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { verifyCronSecret, jsonHeaders, corsHeaders, unauthorized } from "../_shared/auth.ts";
import { getErrorMessage } from "../_shared/errors.ts";

const BACKUP_BUCKET = "db-backups";
const PAGE_SIZE = 1000;
const RETENTION_DAYS = 56;
const MAX_PAGES_PER_TABLE = 500;

interface TableBackupResult {
  table: string;
  rows: number;
  bytes: number;
  error?: string;
}

interface BackupManifest {
  started_at: string;
  finished_at: string;
  duration_ms: number;
  tables: TableBackupResult[];
  total_rows: number;
  total_bytes: number;
  note: string;
}

function backupFolderName(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(date);
}

async function dumpTable(
  supabase: ReturnType<typeof createClient>,
  table: string
): Promise<{ rows: Record<string, unknown>[]; error?: string }> {
  const rows: Record<string, unknown>[] = [];
  for (let page = 0; page < MAX_PAGES_PER_TABLE; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + PAGE_SIZE - 1);

    if (error) return { rows, error: error.message };
    const batch = (data ?? []) as Record<string, unknown>[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return { rows };
}

async function uploadJson(
  supabase: ReturnType<typeof createClient>,
  path: string,
  payload: unknown
): Promise<{ bytes: number; error?: string }> {
  const body = new TextEncoder().encode(JSON.stringify(payload));
  const { error } = await supabase.storage
    .from(BACKUP_BUCKET)
    .upload(path, body, { contentType: "application/json", upsert: true });
  return { bytes: body.byteLength, error: error?.message };
}

async function pruneOldBackups(
  supabase: ReturnType<typeof createClient>,
  now: Date
): Promise<string[]> {
  const removed: string[] = [];
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 3600 * 1000);

  const { data: folders, error } = await supabase.storage.from(BACKUP_BUCKET).list("", {
    limit: 200,
  });
  if (error || !folders) return removed;

  for (const folder of folders) {
    // Foldery nazwane datami YYYY-MM-DD; pomijamy wszystko inne.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(folder.name)) continue;
    if (new Date(`${folder.name}T00:00:00Z`) >= cutoff) continue;

    const { data: files } = await supabase.storage.from(BACKUP_BUCKET).list(folder.name, {
      limit: 200,
    });
    const paths = (files ?? []).map((f) => `${folder.name}/${f.name}`);
    if (paths.length > 0) {
      const { error: removeError } = await supabase.storage.from(BACKUP_BUCKET).remove(paths);
      if (!removeError) removed.push(folder.name);
    }
  }
  return removed;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!verifyCronSecret(req)) return unauthorized();

  const startedAt = new Date();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tableNames, error: listError } = await supabase.rpc("backup_list_tables");
    if (listError) throw new Error(`backup_list_tables: ${listError.message}`);

    const tables = (tableNames ?? []) as string[];
    if (tables.length === 0) throw new Error("Brak tabel do skopiowania.");

    const folder = backupFolderName(startedAt);
    const results: TableBackupResult[] = [];

    for (const table of tables) {
      const { rows, error: dumpError } = await dumpTable(supabase, table);
      if (dumpError) {
        results.push({ table, rows: rows.length, bytes: 0, error: dumpError });
        continue;
      }
      const { bytes, error: uploadError } = await uploadJson(
        supabase,
        `${folder}/${table}.json`,
        rows
      );
      results.push({
        table,
        rows: rows.length,
        bytes,
        ...(uploadError ? { error: uploadError } : {}),
      });
    }

    const finishedAt = new Date();
    const manifest: BackupManifest = {
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms: finishedAt.getTime() - startedAt.getTime(),
      tables: results,
      total_rows: results.reduce((acc, r) => acc + r.rows, 0),
      total_bytes: results.reduce((acc, r) => acc + r.bytes, 0),
      note:
        "Kopia danych (wiersze tabel public). Schemat, RLS i funkcje SQL sa wersjonowane w supabase/migrations. Pliki ze Storage (zalaczniki pism, avatary) nie wchodza w sklad tej kopii.",
    };
    await uploadJson(supabase, `${folder}/_manifest.json`, manifest);

    const pruned = await pruneOldBackups(supabase, startedAt);

    const failed = results.filter((r) => r.error);
    const status = failed.length === 0 ? 200 : 207;

    return new Response(
      JSON.stringify({
        success: failed.length === 0,
        folder,
        tables_ok: results.length - failed.length,
        tables_failed: failed.map((f) => ({ table: f.table, error: f.error })),
        total_rows: manifest.total_rows,
        total_bytes: manifest.total_bytes,
        pruned_folders: pruned,
      }),
      { status, headers: jsonHeaders }
    );
  } catch (err) {
    console.error("Krytyczny blad w backup-database:", err);
    return new Response(JSON.stringify({ error: getErrorMessage(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});