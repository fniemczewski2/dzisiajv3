// lib/server/shortcutAuth.ts

import type { NextApiRequest } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hashShortcutToken } from "./shortcutTokens";

export function extractShortcutToken(req: NextApiRequest): string | null {
  const authorization = req.headers.authorization;
  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }
  const headerToken = req.headers["x-api-secret"];
  if (typeof headerToken === "string") return headerToken.trim();
  const bodyToken = (req.body as { token?: unknown } | undefined)?.token;
  return typeof bodyToken === "string" ? bodyToken.trim() : null;
}

export async function resolveShortcutUser(admin: SupabaseClient, token: string): Promise<string | null> {
  const { data, error } = await admin
    .from("shortcut_tokens")
    .select("user_id")
    .eq("token_hash", hashShortcutToken(token))
    .maybeSingle<{ user_id: string }>();
  if (error) {
    // Błąd bazy (np. brak klucza service role) to nie zły token – nie maskujemy go odpowiedzią 401.
    console.error("[shortcutAuth] odczyt shortcut_tokens:", error.message);
    throw new Error("Nie udało się sprawdzić tokenu skrótów.");
  }
  if (!data) return null;

  await admin.from("shortcut_tokens").update({ last_used_at: new Date().toISOString() }).eq("user_id", data.user_id);

  return data.user_id;
}
