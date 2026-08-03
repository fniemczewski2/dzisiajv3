// pages/api/auth/delete.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
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
    const { data, error } = await admin
      .from(table)
      .delete()
      .eq("user_id", userId)
      .select("id");
    report[table] = error ? error.message : (data?.length ?? 0);
  }
  return report;
}

async function deleteUserFiles(admin: SupabaseClient, userId: string): Promise<number> {
  let removed = 0;

  for (const bucket of USER_STORAGE_BUCKETS) {
    const { data, error } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
    if (error || !data?.length) continue;

    const paths = data.map((file) => `${userId}/${file.name}`);
    const { error: removeError } = await admin.storage.from(bucket).remove(paths);
    if (!removeError) removed += paths.length;
  }
  return removed;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const supabase = createServerSupabase(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Unauthorized" });
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
