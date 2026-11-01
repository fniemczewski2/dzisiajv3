// pages/api/obsidian/connection.ts
//
// GET – stan połączenia z vaultem (bez tokenów); DELETE – odłączenie i usunięcie stanu synchronizacji.
// Pliki w chmurze i dane w aplikacji zostają bez zmian.

import type { NextApiRequest, NextApiResponse } from "next";
import { CACHE_CONTROL } from "@/config/server";
import { allowMethods, requireUser } from "@/lib/server/apiGuards";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (!allowMethods(req, res, ["GET", "DELETE"])) return;
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, user } = auth;
  res.setHeader("Cache-Control", CACHE_CONTROL.private);

  if (req.method === "GET") {
    const { data } = await supabase
      .from("vault_connections")
      .select("provider, email, last_synced_at")
      .eq("user_id", user.id)
      .maybeSingle();
    res.status(200).json({
      connection: data ? { provider: data.provider, email: data.email, lastSyncedAt: data.last_synced_at } : null,
    });
    return;
  }
  await supabase.from("vault_sync_state").delete().eq("user_id", user.id);
  const { error } = await supabase.from("vault_connections").delete().eq("user_id", user.id);
  if (error) {
    res.status(500).json({ error: "Nie udało się odłączyć vaultu." });
    return;
  }
  res.status(204).end();
}
