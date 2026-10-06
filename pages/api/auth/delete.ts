// pages/api/auth/delete.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { mapPool, chunk } from "@/lib/asyncPool";
import {
  USER_DATA_TABLES,
  USER_STORAGE_BUCKETS,
  ACCOUNT_DELETE_CONFIRMATION,
} from "@/config/userData";

interface DeletionReport {
  tables: Record<string, number | string>;
  files_removed: number;
  auth_deleted: boolean;
}

function adminClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
}

async function deleteUserRows(
  admin: SupabaseClient,
  userId: string
): Promise<Record<string, number | string>> {
  const report: Record<string, number | string> = {};

  for (const table of USER_DATA_TABLES) {
    // select("user_id"), nie "id": settings, daily_habits, shortcut_tokens czy
    // slack_task_targets nie mają kolumny id, a PostgREST odrzucał wtedy całe
    // żądanie – wiersze zostawały, a klucze obce blokowały usunięcie konta.
    const { data, error } = await admin // NOSONAR – kolejność tabel ma znaczenie – podrzędne przed nadrzędnymi (klucze obce)
      .from(table)
      .delete()
      .eq("user_id", userId)
      .select("user_id");
    if (error) {
      // Szczegóły tylko w logach – raport trafia do przeglądarki.
      console.error(`[account/delete] ${table}:`, error.message);
      report[table] = "error";
    } else {
      report[table] = data?.length ?? 0;
    }
  }

  // Zadania zlecone temu użytkownikowi przez innych zostają u zleceniodawcy,
  // ale bez wskazania na usuwane konto.
  const { error: unassignError } = await admin.from("tasks").update({ for_user_id: null }).eq("for_user_id", userId);
  if (unassignError) console.error("[account/delete] tasks.for_user_id:", unassignError.message);
  await mapPool(["events", "shopping_lists"] as const, 4, async (table) => {
    const { error } = await admin.from(table).update({ shared_with_id: null }).eq("shared_with_id", userId);
    if (error) console.error(`[account/delete] ${table}.shared_with_id:`, error.message);
  });

  return report;
}

const STORAGE_PAGE = 1000;

/** Wszystkie ścieżki plików pod prefiksem – rekurencyjnie i ze stronicowaniem. */
async function listAllPaths(admin: SupabaseClient, bucket: string, prefix: string): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += STORAGE_PAGE) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: STORAGE_PAGE, offset }); // NOSONAR – stronicowanie – kolejna strona wymaga wyniku poprzedniej
    if (error || !data?.length) break;

    await mapPool(data, 4, async (entry) => { // NOSONAR – stronicowanie – kolejna strona wymaga wyniku poprzedniej
      const fullPath = `${prefix}/${entry.name}`;
      // Foldery w Storage nie mają id (to tylko prefiksy).
      if (!entry.id) paths.push(...(await listAllPaths(admin, bucket, fullPath)));
      else paths.push(fullPath);
    });
    if (data.length < STORAGE_PAGE) break;
  }
  return paths;
}

async function deleteUserFiles(admin: SupabaseClient, userId: string): Promise<number> {
  let removed = 0;

  await mapPool(USER_STORAGE_BUCKETS, USER_STORAGE_BUCKETS.length, async (bucket) => {
    const paths = await listAllPaths(admin, bucket, userId);
    await mapPool(chunk(paths, STORAGE_PAGE), 2, async (part) => {
      const { error: removeError } = await admin.storage.from(bucket).remove(part);
      if (removeError) console.error(`[account/delete] storage ${bucket}:`, removeError.message);
      else removed += part.length;
    });
  });
  return removed;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Metoda niedozwolona." });

  const supabase = createServerSupabase(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Brak autoryzacji." });
  const confirmation = String((req.body as { confirmation?: string })?.confirmation ?? "");
  if (confirmation.trim() !== ACCOUNT_DELETE_CONFIRMATION) {
    return res.status(400).json({ error: "Nieprawidłowa fraza potwierdzająca." });
  }

  const admin = adminClient();

  try {
    const tables = await deleteUserRows(admin, user.id);
    const filesRemoved = await deleteUserFiles(admin, user.id);
    await admin.from("users").delete().eq("id", user.id);

    const { error: authError } = await admin.auth.admin.deleteUser(user.id);
    if (authError) {
      console.error("[account/delete] Nie udało się usunąć konta auth:", authError.message);
      return res.status(500).json({
        error: "Dane zostały usunięte, ale konta logowania nie udało się skasować. Skontaktuj się z administratorem.",
      });
    }

    await supabase.auth.signOut();

    const report: DeletionReport = { tables, files_removed: filesRemoved, auth_deleted: true };
    return res.status(200).json(report);
  } catch (err) {
    console.error("[account/delete]:", err);
    return res.status(500).json({ error: "Usuwanie konta nie powiodło się." });
  }
}
