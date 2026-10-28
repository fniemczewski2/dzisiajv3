// pages/api/mail/accounts.ts
//
// Lista podłączonych kont poczty (bez tokenów) i odłączanie konta (z unieważnieniem tokenu Google).

import type { NextApiRequest, NextApiResponse } from "next";
import { CACHE_CONTROL } from "@/config/server";
import { allowMethods, requireUser } from "@/lib/server/apiGuards";
import { decryptToken } from "@/lib/server/tokenCrypto";
import { fetchWithTimeout } from "@/lib/server/fetchWithTimeout";
import { isUuid } from "@/lib/server/mailRoute";
import { toPublicAccount } from "@/lib/mail/accountRules";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET", "DELETE"])) return;
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase } = auth;
  res.setHeader("Cache-Control", CACHE_CONTROL.private);

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("mail_accounts")
      .select("id, provider, email, created_at, scope")
      .order("created_at", { ascending: true });
    if (error) return res.status(500).json({ error: "Nie udało się pobrać kont." });
    const accounts = (data ?? []).map((row) => toPublicAccount(row)).filter((a) => a !== null);
    return res.status(200).json({ accounts });
  }

  const { id } = req.query;
  if (!isUuid(id)) return res.status(400).json({ error: "Nieprawidłowy identyfikator konta." });

  const { data: row } = await supabase
    .from("mail_accounts")
    .select("id, provider, refresh_token, access_token")
    .eq("id", id)
    .maybeSingle();
  if (!row) return res.status(404).json({ error: "Nie znaleziono konta." });

  const { data: deleted, error } = await supabase.from("mail_accounts").delete().eq("id", id).select("id");
  if (error) return res.status(500).json({ error: "Nie udało się odłączyć konta." });
  if (!deleted || deleted.length === 0) return res.status(404).json({ error: "Nie znaleziono konta." });

  // Najlepsza próba unieważnienia tokenu u Google; błąd nie cofa odłączenia w aplikacji.
  // Microsoft nie udostępnia unieważnienia pojedynczego tokenu – zgodę cofa się w ustawieniach konta Microsoft.
  if (row.provider === "gmail") {
    try {
      const token = decryptToken((row.refresh_token as string | null) ?? (row.access_token as string));
      await fetchWithTimeout("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token }),
      });
    } catch (err) {
      console.warn("[mail/accounts] unieważnienie tokenu Google:", err);
    }
  }
  return res.status(204).end();
}
