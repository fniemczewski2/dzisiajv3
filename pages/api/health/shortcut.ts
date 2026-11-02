// pages/api/health/shortcut.ts
//
// POST ze Skrótu iOS (Apple Zdrowie): kroki, tętno, sen, treningi. Uwierzytelnianie tokenem skrótów
// (jak czas pracy i szybkie notatki). Dane o zdrowiu (art. 9 RODO) zapisujemy wyłącznie przy aktualnej
// zgodzie z ustawień; bez niej żądanie jest odrzucane i nic nie trafia do bazy.

import type { NextApiRequest, NextApiResponse } from "next";
import { HEALTH_CONSENT_VERSION } from "@/config/defaults";
import { allowMethods } from "@/lib/server/apiGuards";
import { clientIp, enforceRateLimit } from "@/lib/server/rateLimit";
import { looksLikeShortcutToken } from "@/lib/server/shortcutTokens";
import { extractShortcutToken, resolveShortcutUser } from "@/lib/server/shortcutAuth";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseHealthPayload, type ParsedHealthPayload } from "@/lib/health/shortcutPayload";

/**
 * Treść jako obiekt. Gdy nagłówek Content-Type nie jest dokładnie „application/json” (np. Skróty z ręcznie dodanym
 * nagłówkiem wysyłają „application/json, application/json”), Next.js przekazuje treść jako tekst – dekodujemy ją sami.
 */
function jsonBody(body: unknown): unknown {
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
}

/** Rejestr tętna z dnia to kilkaset pomiarów – większy limit treści niż domyślny 1 MB. */
export const config = { api: { bodyParser: { sizeLimit: "2mb" } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (!allowMethods(req, res, ["POST"])) return;
  if (!(await enforceRateLimit(res, "healthShortcut", clientIp(req)))) return;

  const token = extractShortcutToken(req);
  if (!looksLikeShortcutToken(token)) {
    res.status(401).json({ error: "Brak autoryzacji (token)." });
    return;
  }
  const parsed = parseHealthPayload(jsonBody(req.body));
  if (!parsed.ok) {
    // Tylko komunikat z nazwą pola – bez wartości (dane o zdrowiu nie trafiają do logów).
    console.warn("[health/shortcut] 400:", parsed.error, `(content-type: ${req.headers["content-type"] ?? "brak"})`);
    res.status(400).json({ error: parsed.error });
    return;
  }

  try {
    await saveHealthData(res, parsed, token);
  } catch (err) {
    console.error("[health/shortcut]", err);
    res.status(500).json({ error: "Usługa chwilowo niedostępna. Spróbuj ponownie później." });
  }
}

type Parsed = Extract<ParsedHealthPayload, { ok: true }>;
type Writer = () => Promise<string | null>;

/** Dzień: jedno wysłanie z tą samą datą zastępuje przesłane pola (np. kroki 300 → 1200), bez sumowania. */
async function writeDaily(admin: SupabaseClient, userId: string, { daily }: Parsed): Promise<string | null> {
  if (Object.keys(daily).length <= 1) return null;
  const { error } = await admin
    .from("health_daily")
    .upsert({ ...daily, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: "user_id,date" });
  if (error) console.error("[health/shortcut] dzień:", error.message);
  return error ? "Nie udało się zapisać danych dnia." : null;
}

async function writeWorkouts(admin: SupabaseClient, userId: string, { workouts }: Parsed): Promise<string | null> {
  if (workouts.length === 0) return null;
  const { error } = await admin.from("health_workouts").upsert(
    workouts.map((w) => ({ ...w, user_id: userId, source: "shortcut" })),
    { onConflict: "user_id,started_at,activity" }
  );
  if (error) console.error("[health/shortcut] treningi:", error.message);
  return error ? "Nie udało się zapisać treningów." : null;
}

/**
 * Sen doby: najpierw zapis nowych odcinków (znacznik synced_at), potem usunięcie starszych odcinków tej doby.
 * Gdy zapis się nie uda, poprzednie dane zostają.
 */
async function writeSleep(
  admin: SupabaseClient,
  userId: string,
  { daily, sleepSegments }: Parsed
): Promise<string | null> {
  if (sleepSegments.length === 0) return null;
  const syncedAt = new Date().toISOString();
  const rows = sleepSegments.map((s) => ({ ...s, user_id: userId, date: daily.date, synced_at: syncedAt }));
  const saved = await admin.from("health_sleep_segments").upsert(rows, { onConflict: "user_id,date,started_at,stage" });
  if (saved.error) {
    console.error("[health/shortcut] sen:", saved.error.message);
    return "Nie udało się zapisać snu.";
  }
  const cleaned = await admin
    .from("health_sleep_segments")
    .delete()
    .eq("user_id", userId)
    .eq("date", daily.date)
    .lt("synced_at", syncedAt);
  if (cleaned.error) console.error("[health/shortcut] sen (czyszczenie):", cleaned.error.message);
  return null;
}

const HEART_RATE_BATCH = 1000;

/** Rejestr tętna: pomiar o tym samym czasie zastępuje poprzedni; dane są łączone z wcześniejszymi (nic nie jest usuwane). */
async function writeHeartRate(
  admin: SupabaseClient,
  userId: string,
  { heartRateSamples }: Parsed
): Promise<string | null> {
  for (let i = 0; i < heartRateSamples.length; i += HEART_RATE_BATCH) {
    const rows = heartRateSamples.slice(i, i + HEART_RATE_BATCH).map((s) => ({ ...s, user_id: userId }));
    const { error } = await admin.from("health_heart_rate").upsert(rows, { onConflict: "user_id,recorded_at" });
    if (error) {
      console.error("[health/shortcut] tętno:", error.message);
      return "Nie udało się zapisać pomiarów tętna.";
    }
  }
  return null;
}

function describeSaved({ daily, workouts, heartRateSamples, sleepSegments }: Parsed): string {
  const parts = [
    workouts.length ? `treningi: ${workouts.length}` : "",
    heartRateSamples.length ? `pomiary tętna: ${heartRateSamples.length}` : "",
    sleepSegments.length ? `odcinki snu: ${sleepSegments.length}` : "",
  ].filter(Boolean);
  return parts.length ? `Zapisano dane z ${daily.date}, ${parts.join(", ")}.` : `Zapisano dane z ${daily.date}.`;
}

async function saveHealthData(res: NextApiResponse, parsed: Parsed, token: string): Promise<void> {
  const admin = supabaseAdmin();
  const userId = await resolveShortcutUser(admin, token);
  if (!userId) {
    res.status(401).json({ error: "Brak autoryzacji (userId)." });
    return;
  }

  const { data: settings } = await admin
    .from("settings")
    .select("health_consent_at, health_consent_version")
    .eq("user_id", userId)
    .maybeSingle();
  if (!settings?.health_consent_at || settings.health_consent_version !== HEALTH_CONSENT_VERSION) {
    res.status(403).json({ error: "Brak zgody na zapis danych o zdrowiu. Udziel jej w ustawieniach aplikacji." });
    return;
  }

  const writers: Writer[] = [writeDaily, writeWorkouts, writeSleep, writeHeartRate].map(
    (write) => () => write(admin, userId, parsed)
  );
  for (const write of writers) {
    const failure = await write();
    if (failure) {
      res.status(500).json({ error: failure });
      return;
    }
  }
  res.status(201).json({ success: true, message: describeSaved(parsed) });
}
