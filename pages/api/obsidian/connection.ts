// pages/api/obsidian/connection.ts
//
// GET – stan połączenia z vaultem (bez tokenów); PATCH { rootPath } – folder vaultu w OneDrive (sprawdzany
// w chmurze; zmiana folderu kasuje stan synchronizacji i decyzje o duplikatach); DELETE – odłączenie i usunięcie
// stanu synchronizacji. Pliki w chmurze i dane w aplikacji zostają bez zmian.

import type { NextApiRequest, NextApiResponse } from "next";
import { CACHE_CONTROL } from "@/config/server";
import { allowMethods, requireUser } from "@/lib/server/apiGuards";
import { vaultAccessToken } from "@/lib/server/vaultConnection";
import { normalizeVaultRoot, oneDriveFolderExists } from "@/lib/obsidian/storage";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (!allowMethods(req, res, ["GET", "PATCH", "DELETE"])) return;
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, user } = auth;
  res.setHeader("Cache-Control", CACHE_CONTROL.private);

  if (req.method === "GET") {
    const { data } = await supabase
      .from("vault_connections")
      .select("provider, email, last_synced_at, root_path")
      .eq("user_id", user.id)
      .maybeSingle();
    res.status(200).json({
      connection: data
        ? { provider: data.provider, email: data.email, lastSyncedAt: data.last_synced_at, rootPath: data.root_path }
        : null,
    });
    return;
  }

  if (req.method === "PATCH") {
    const raw = (req.body as { rootPath?: unknown } | undefined)?.rootPath;
    if (typeof raw !== "string" || raw.length > 300) {
      res.status(400).json({ error: "Podaj ścieżkę folderu." });
      return;
    }
    const rootPath = normalizeVaultRoot(raw);
    if (raw.trim() && !rootPath) {
      res.status(400).json({ error: "Nieprawidłowa ścieżka folderu." });
      return;
    }
    const { data: conn } = await supabase
      .from("vault_connections")
      .select("user_id, provider, access_token, refresh_token, expires_at, root_path")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!conn) {
      res.status(404).json({ error: "Najpierw połącz OneDrive." });
      return;
    }
    if (conn.provider !== "onedrive") {
      res.status(400).json({ error: "Wybór folderu jest dostępny tylko dla OneDrive." });
      return;
    }
    if (rootPath) {
      const token = await vaultAccessToken(supabase, conn);
      if (!token) {
        res.status(401).json({ error: "Połączenie wygasło. Połącz chmurę ponownie." });
        return;
      }
      try {
        if (!(await oneDriveFolderExists(token, rootPath))) {
          res.status(404).json({ error: `Nie znaleziono folderu „${rootPath}” w OneDrive.` });
          return;
        }
      } catch (err) {
        console.error("[obsidian/connection] folder:", err instanceof Error ? err.message : err);
        res
          .status(502)
          .json({ error: "Nie udało się sprawdzić folderu. Połącz OneDrive ponownie (nowe uprawnienia)." });
        return;
      }
    }
    if ((conn.root_path ?? null) !== rootPath) {
      await supabase.from("vault_sync_state").delete().eq("user_id", user.id);
      await supabase.from("vault_import_decisions").delete().eq("user_id", user.id);
    }
    const { error } = await supabase
      .from("vault_connections")
      .update({ root_path: rootPath, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (error) {
      res.status(500).json({ error: "Nie udało się zapisać folderu." });
      return;
    }
    res.status(200).json({ rootPath });
    return;
  }

  await supabase.from("vault_sync_state").delete().eq("user_id", user.id);
  await supabase.from("vault_import_decisions").delete().eq("user_id", user.id);
  const { error } = await supabase.from("vault_connections").delete().eq("user_id", user.id);
  if (error) {
    res.status(500).json({ error: "Nie udało się odłączyć vaultu." });
    return;
  }
  res.status(204).end();
}
