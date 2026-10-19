// pages/api/account/export.ts
//
// GET – kopia wszystkich danych konta w jednym pliku JSON (RODO art. 15 i 20).
// Bez haseł, tokenów integracji, kluczy push i tokenów udostępniania ankiet.

import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, requireUser } from "@/lib/server/apiGuards";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { exportUserData } from "@/lib/server/accountData";
import { EXPORT_BUCKET, EXPORT_FILE_PREFIX, EXPORT_FORMAT_VERSION } from "@/config/userData";
import { CACHE_CONTROL, EXPORT_INLINE_MAX_BYTES, EXPORT_SIGNED_URL_SECONDS } from "@/config/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const EXPORT_NOTE =
  "Kopia Twoich danych z aplikacji Dzisiaj.Fun. Plik nie zawiera haseł, tokenów dostępu do " +
  "integracji (Google, Outlook, Slack), kluczy powiadomień push ani tokenów udostępniania ankiet. " +
  "Sekcja „files” wymienia Twoje pliki w magazynie (pisma, zdjęcie profilowe, szablony protokołów).";

/**
 * Duży eksport: zapis do prywatnego bucketu (poprzednie eksporty tej osoby są
 * usuwane) i podpisany link ważny EXPORT_SIGNED_URL_SECONDS sekund.
 */
async function storeLargeExport(
  admin: SupabaseClient,
  userId: string,
  fileName: string,
  body: string
): Promise<string> {
  const bucket = admin.storage.from(EXPORT_BUCKET);
  const { data: previous } = await bucket.list(userId);
  if (previous?.length) await bucket.remove(previous.map((f) => `${userId}/${f.name}`));

  const path = `${userId}/${fileName}`;
  const { error: uploadError } = await bucket.upload(path, new Blob([body], { type: "application/json" }), {
    contentType: "application/json",
    upsert: true,
  });
  if (uploadError) throw new Error(`Zapis eksportu w Storage nie powiódł się: ${uploadError.message}`);

  const { data, error } = await bucket.createSignedUrl(path, EXPORT_SIGNED_URL_SECONDS, { download: fileName });
  if (error || !data) throw new Error(`Nie udało się utworzyć linku do eksportu: ${error?.message ?? "brak danych"}`);
  return data.signedUrl;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", CACHE_CONTROL.private);
  if (!allowMethods(req, res, ["GET"])) return;
  const session = await requireUser(req, res);
  if (!session) return;
  const { user } = session;

  try {
    const payload = await exportUserData(supabaseAdmin(), user, {
      formatVersion: EXPORT_FORMAT_VERSION,
      note: EXPORT_NOTE,
    });
    const date = new Date().toISOString().slice(0, 10);
    const fileName = `${EXPORT_FILE_PREFIX}_${date}.json`;
    const body = JSON.stringify(payload, null, 2);

    if (Buffer.byteLength(body, "utf8") <= EXPORT_INLINE_MAX_BYTES) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      return res.status(200).send(body);
    }

    const url = await storeLargeExport(supabaseAdmin(), user.id, fileName, body);
    return res.status(200).json({ downloadUrl: url, fileName });
  } catch (error) {
    console.error("[account/export]:", error);
    return res.status(500).json({ error: "Nie udało się przygotować kopii danych. Spróbuj ponownie." });
  }
}
