// pages/api/account/export.ts
//
// GET – kopia wszystkich danych konta w jednym pliku JSON (RODO art. 15 i 20).
// Bez haseł, tokenów integracji, kluczy push i tokenów udostępniania ankiet.

import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { exportUserData } from "@/lib/server/accountData";
import { EXPORT_FILE_PREFIX, EXPORT_FORMAT_VERSION } from "@/config/userData";
import { CACHE_CONTROL } from "@/config/server";

const EXPORT_NOTE =
  "Kopia Twoich danych z aplikacji Dzisiaj.Fun. Plik nie zawiera haseł, tokenów dostępu do " +
  "integracji (Google, Outlook, Slack), kluczy powiadomień push ani tokenów udostępniania ankiet. " +
  "Sekcja „files” wymienia Twoje pliki w magazynie (pisma, zdjęcie profilowe, szablony protokołów).";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", CACHE_CONTROL.private);
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Metoda niedozwolona." });
  }

  const {
    data: { user },
  } = await createServerSupabase(req, res).auth.getUser();
  if (!user) return res.status(401).json({ error: "Brak autoryzacji." });

  try {
    const payload = await exportUserData(supabaseAdmin(), user, {
      formatVersion: EXPORT_FORMAT_VERSION,
      note: EXPORT_NOTE,
    });
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${EXPORT_FILE_PREFIX}_${date}.json"`);
    return res.status(200).send(JSON.stringify(payload, null, 2));
  } catch (error) {
    console.error("[account/export]:", error);
    return res.status(500).json({ error: "Nie udało się przygotować kopii danych. Spróbuj ponownie." });
  }
}
