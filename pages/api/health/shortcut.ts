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
import { parseHealthPayload } from "@/lib/health/shortcutPayload";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (!allowMethods(req, res, ["POST"])) return;
  if (!(await enforceRateLimit(res, "healthShortcut", clientIp(req)))) return;

  const token = extractShortcutToken(req);
  if (!looksLikeShortcutToken(token)) {
    res.status(401).json({ error: "Brak autoryzacji (token)." });
    return;
  }
  const parsed = parseHealthPayload(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

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

  const { daily, workouts } = parsed;
  if (Object.keys(daily).length > 1) {
    const { error } = await admin
      .from("health_daily")
      .upsert({ ...daily, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: "user_id,date" });
    if (error) {
      console.error("[health/shortcut] dzień:", error.message);
      res.status(500).json({ error: "Nie udało się zapisać danych dnia." });
      return;
    }
  }
  if (workouts.length > 0) {
    const { error } = await admin.from("health_workouts").upsert(
      workouts.map((w) => ({ ...w, user_id: userId, source: "shortcut" })),
      { onConflict: "user_id,started_at,activity" }
    );
    if (error) {
      console.error("[health/shortcut] treningi:", error.message);
      res.status(500).json({ error: "Nie udało się zapisać treningów." });
      return;
    }
  }
  res.status(201).json({
    success: true,
    message: `Zapisano dane z ${daily.date}${workouts.length ? `, treningi: ${workouts.length}` : ""}.`,
  });
}
