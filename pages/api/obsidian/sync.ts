// pages/api/obsidian/sync.ts
//
// POST – synchronizacja z vaultem Obsidiana. Odpowiedź: liczba wysłanych, zaktualizowanych, zaimportowanych
// plików i konfliktów.

import type { NextApiRequest, NextApiResponse } from "next";
import { CACHE_CONTROL, MAX_VAULT_FILES } from "@/config/server";
import { allowMethods, requireUser } from "@/lib/server/apiGuards";
import { enforceRateLimit } from "@/lib/server/rateLimit";
import { getAppDate } from "@/lib/dateUtils";
import { supabaseVaultRepo, vaultStorageFor } from "@/lib/server/vaultConnection";
import { runVaultSync } from "@/lib/obsidian/runSync";
import { VaultStorageError } from "@/lib/obsidian/storage";

/** Duże vaulty: więcej czasu niż domyślny limit funkcji. */
export const config = { maxDuration: 60 };

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (!allowMethods(req, res, ["POST"])) return;
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, user } = auth;
  res.setHeader("Cache-Control", CACHE_CONTROL.private);
  if (!(await enforceRateLimit(res, "vaultSync", user.id))) return;

  const { data: conn } = await supabase
    .from("vault_connections")
    .select("user_id, provider, access_token, refresh_token, expires_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!conn) {
    res.status(404).json({ error: "Najpierw połącz OneDrive lub Google Drive." });
    return;
  }
  const storage = await vaultStorageFor(supabase, conn);
  if (!storage) {
    res.status(401).json({ error: "Połączenie wygasło. Połącz chmurę ponownie." });
    return;
  }
  try {
    const summary = await runVaultSync(supabaseVaultRepo(supabase, user.id), storage, {
      today: getAppDate(),
      maxFiles: MAX_VAULT_FILES,
    });
    await supabase
      .from("vault_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("user_id", user.id);
    res.status(200).json({ summary });
  } catch (err) {
    console.error("[obsidian/sync]", err);
    const status = err instanceof VaultStorageError && err.status === 401 ? 401 : 502;
    res.status(status).json({
      error: status === 401 ? "Chmura odrzuciła token. Połącz ponownie." : "Synchronizacja nie powiodła się.",
    });
  }
}
