// pages/api/account/delete.ts
//
// POST – usunięcie konta: wszystkie dane (config/userData.ts), pliki
// w Storage i konto logowania. Wymaga frazy potwierdzającej w treści.

import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { AccountDataError, deleteUserData } from "@/lib/server/accountData";
import { ACCOUNT_DELETE_CONFIRMATION } from "@/config/userData";
import { CACHE_CONTROL } from "@/config/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", CACHE_CONTROL.private);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metoda niedozwolona." });
  }

  const supabase = createServerSupabase(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Brak autoryzacji." });

  const raw = (req.body as { confirmation?: unknown } | undefined)?.confirmation;
  const confirmation = typeof raw === "string" ? raw.trim() : "";
  if (confirmation !== ACCOUNT_DELETE_CONFIRMATION) {
    return res.status(400).json({ error: `Wpisz dokładnie „${ACCOUNT_DELETE_CONFIRMATION}”, aby potwierdzić.` });
  }

  try {
    const admin = supabaseAdmin();
    const report = await deleteUserData(admin, user.id);

    const { error: authError } = await admin.auth.admin.deleteUser(user.id);
    if (authError) {
      console.error("[account/delete] Nie udało się usunąć konta logowania:", authError.message);
      return res.status(500).json({
        error: "Dane zostały usunięte, ale konta logowania nie udało się skasować. Spróbuj ponownie za chwilę.",
      });
    }

    await supabase.auth.signOut();
    return res.status(200).json({ ...report, auth_deleted: true });
  } catch (error) {
    const step = error instanceof AccountDataError ? error.step : "nieznany";
    console.error(`[account/delete] Przerwano na kroku ${step}:`, error);
    return res.status(500).json({
      error:
        "Nie udało się usunąć wszystkich danych. Konto pozostało aktywne – spróbuj ponownie lub napisz do administratora.",
    });
  }
}
