// lib/server/accountData.ts
//
// Eksport i usuwanie wszystkich danych konta (RODO art. 15, 17, 20) na
// podstawie rejestru config/userData.ts. Działa kluczem service_role, więc
// każde zapytanie jest jawnie zawężone do id użytkownika.

import type { SupabaseClient } from "@supabase/supabase-js";
import { chunk, mapPool } from "@/shared/asyncPool";
import { PAGING } from "@/config/server";
import {
  MEETING_POLL_EXPORT_COLUMNS,
  MEETING_POLL_EXPORT_LABELS,
  SHARED_REFERENCES,
  USER_STORAGE_BUCKETS,
  USER_TABLES,
  type UserTable,
} from "@/config/userData";

type Row = Record<string, unknown>;

export class AccountDataError extends Error {
  constructor(
    message: string,
    public readonly step: string
  ) {
    super(message);
    this.name = "AccountDataError";
  }
}

/** Kod błędu PostgREST/Postgres dla nieistniejącej tabeli – tabela z rejestru może nie być jeszcze w bazie. */
function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

async function selectAll(
  admin: SupabaseClient,
  table: string,
  columns: string,
  filter: { column: string; values: readonly string[] }
): Promise<Row[]> {
  if (filter.values.length === 0) return [];
  const rows: Row[] = [];
  for (const ids of chunk(filter.values, PAGING.dataExportPage)) {
    for (let from = 0; ; from += PAGING.dataExportPage) {
      // Strony po kolei – kolejność i limit zapytań bazy.
      const { data, error } = await admin
        .from(table)
        .select(columns)
        .in(filter.column, ids)
        .range(from, from + PAGING.dataExportPage - 1);
      if (isMissingTable(error)) return rows;
      if (error) throw new AccountDataError(error.message, `export:${table}`);
      const batch = (data ?? []) as unknown as Row[];
      rows.push(...batch);
      if (batch.length < PAGING.dataExportPage) break;
    }
  }
  return rows;
}

const ids = (rows: Row[]) => rows.map((r) => String(r.id));

async function listAllPaths(admin: SupabaseClient, bucket: string, prefix: string): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += PAGING.storageList) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: PAGING.storageList, offset });
    if (error || !data?.length) break;
    // Podkatalogi rekurencyjnie, pliki od razu.
    await mapPool(data, 4, async (entry) => {
      const fullPath = `${prefix}/${entry.name}`;
      if (entry.id) paths.push(fullPath);
      else paths.push(...(await listAllPaths(admin, bucket, fullPath)));
    });
    if (data.length < PAGING.storageList) break;
  }
  return paths;
}

export interface UserDataExport {
  exported_at: string;
  format_version: number;
  user: { id: string; email: string | null };
  note: string;
  data: Record<string, { table: string; rows: Row[] }>;
  files: Record<string, string[]>;
}

/** Wszystkie dane konta jako jeden obiekt JSON (bez tokenów i sekretów). */
export async function exportUserData(
  admin: SupabaseClient,
  user: { id: string; email?: string | null },
  meta: { formatVersion: number; note: string }
): Promise<UserDataExport> {
  const data: UserDataExport["data"] = {};

  await mapPool(USER_TABLES, 4, async (entry: UserTable) => {
    const rows = await selectAll(admin, entry.table, entry.exportColumns ?? "*", {
      column: entry.owner,
      values: [user.id],
    });
    data[entry.table] = { table: entry.table, rows };
  });

  const polls = await selectAll(admin, "meeting_polls", MEETING_POLL_EXPORT_COLUMNS.polls, {
    column: "user_id",
    values: [user.id],
  });
  const pollIds = ids(polls);
  const responses = await selectAll(admin, "meeting_poll_responses", MEETING_POLL_EXPORT_COLUMNS.responses, {
    column: "poll_id",
    values: pollIds,
  });
  const ownResponses = await selectAll(admin, "meeting_poll_responses", MEETING_POLL_EXPORT_COLUMNS.responses, {
    column: "user_id",
    values: [user.id],
  });
  data.meeting_polls = { table: MEETING_POLL_EXPORT_LABELS.polls, rows: polls };
  data.meeting_poll_dates = {
    table: MEETING_POLL_EXPORT_LABELS.dates,
    rows: await selectAll(admin, "meeting_poll_dates", "*", { column: "poll_id", values: pollIds }),
  };
  data.meeting_poll_responses = { table: MEETING_POLL_EXPORT_LABELS.responses, rows: responses };
  data.meeting_poll_availabilities = {
    table: MEETING_POLL_EXPORT_LABELS.availabilities,
    rows: await selectAll(admin, "meeting_poll_availabilities", "*", { column: "response_id", values: ids(responses) }),
  };
  data.meeting_poll_own_responses = { table: MEETING_POLL_EXPORT_LABELS.ownResponses, rows: ownResponses };

  const files: Record<string, string[]> = {};
  await mapPool(USER_STORAGE_BUCKETS, USER_STORAGE_BUCKETS.length, async (bucket) => {
    files[bucket] = await listAllPaths(admin, bucket, user.id);
  });

  // Etykiety sekcji – czytelne nazwy zamiast nazw tabel.
  for (const entry of USER_TABLES) data[entry.table].table = entry.label;

  return {
    exported_at: new Date().toISOString(),
    format_version: meta.formatVersion,
    user: { id: user.id, email: user.email ?? null },
    note: meta.note,
    data,
    files,
  };
}

async function deleteWhere(
  admin: SupabaseClient,
  table: string,
  column: string,
  values: readonly string[]
): Promise<number> {
  let removed = 0;
  for (const part of chunk(values, PAGING.dataExportPage)) {
    const { data, error } = await admin.from(table).delete().in(column, part).select(column);
    if (isMissingTable(error)) return removed;
    if (error) throw new AccountDataError(error.message, `delete:${table}`);
    removed += data?.length ?? 0;
  }
  return removed;
}

export interface DeletionReport {
  tables: Record<string, number>;
  files_removed: number;
}

/**
 * Usuwa wszystkie dane konta w kolejności zależności. Przy pierwszym błędzie
 * przerywa i rzuca AccountDataError – konto logowania zostaje, więc można
 * ponowić (operacja jest idempotentna).
 */
export async function deleteUserData(admin: SupabaseClient, userId: string): Promise<DeletionReport> {
  const report: DeletionReport = { tables: {}, files_removed: 0 };

  // Odwołania w cudzych wierszach (udostępnione zadania, wydarzenia, listy).
  // Niezależne tabele – równolegle.
  await Promise.all(
    SHARED_REFERENCES.map(async (ref) => {
      const { error } = await admin
        .from(ref.table)
        .update({ [ref.column]: null })
        .eq(ref.column, userId);
      if (error && !isMissingTable(error)) throw new AccountDataError(error.message, `unshare:${ref.table}`);
    })
  );

  // Ankiety: dostępność → odpowiedzi → dni → ankiety. Także odpowiedzi tej osoby w cudzych ankietach.
  const polls = await selectAll(admin, "meeting_polls", "id", { column: "user_id", values: [userId] });
  const pollResponses = await selectAll(admin, "meeting_poll_responses", "id", {
    column: "poll_id",
    values: ids(polls),
  });
  const ownResponses = await selectAll(admin, "meeting_poll_responses", "id", { column: "user_id", values: [userId] });
  const responseIds = [...new Set([...ids(pollResponses), ...ids(ownResponses)])];
  report.tables.meeting_poll_availabilities = await deleteWhere(
    admin,
    "meeting_poll_availabilities",
    "response_id",
    responseIds
  );
  report.tables.meeting_poll_responses = await deleteWhere(admin, "meeting_poll_responses", "id", responseIds);
  report.tables.meeting_poll_dates = await deleteWhere(admin, "meeting_poll_dates", "poll_id", ids(polls));
  report.tables.meeting_polls = await deleteWhere(admin, "meeting_polls", "id", ids(polls));

  const stages = [...new Set(USER_TABLES.map((t) => t.stage))].sort((a, b) => a - b);
  // Etapy kolejno (dzieci przed rodzicami – klucze obce), w obrębie etapu tabele równolegle.
  await mapPool(stages, 1, async (stage) => {
    const tables = USER_TABLES.filter((t) => t.stage === stage);
    await mapPool(tables, 4, async (entry) => {
      report.tables[entry.table] = await deleteWhere(admin, entry.table, entry.owner, [userId]);
    });
  });

  await mapPool(USER_STORAGE_BUCKETS, USER_STORAGE_BUCKETS.length, async (bucket) => {
    const paths = await listAllPaths(admin, bucket, userId);
    await Promise.all(
      chunk(paths, PAGING.storageList).map(async (part) => {
        const { error } = await admin.storage.from(bucket).remove(part);
        if (error) throw new AccountDataError(error.message, `storage:${bucket}`);
        report.files_removed += part.length;
      })
    );
  });

  return report;
}
