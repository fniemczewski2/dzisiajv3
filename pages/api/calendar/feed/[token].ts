// pages/api/calendar/feed/[token].ts
//
// Kanał kalendarza .ics do subskrypcji (webcal://…/api/calendar/feed/<token>.ics) w Kalendarzu Apple,
// Thunderbirdzie i innych. Bez sesji – uwierzytelnia token w ścieżce; nieznany token → 404 (bez rozróżnienia
// „istnieje/nie istnieje”). Zakres: lib/calendarFeed.ts (FEED_PAST_DAYS, FEED_FUTURE_DAYS).

import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods } from "@/lib/server/apiGuards";
import { clientIp, enforceRateLimit } from "@/lib/server/rateLimit";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { feedTokenFromPath, hashFeedToken } from "@/lib/server/calendarFeedTokens";
import { buildCalendarFeed, feedRange } from "@/lib/calendarFeed";
import { getAppDate } from "@/lib/dateUtils";
import { cols } from "@/lib/db/columns";
import { ownedOrSharedFilter } from "@/lib/postgrestFilters";
import type { Event } from "@/types/events";
import type { Task } from "@/types/tasks";
import type { DailyOverride, Schema } from "@/types/schemas";

const UID_DOMAIN = "dzisiaj.fun";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET", "HEAD"])) return;
  if (!(await enforceRateLimit(res, "calendarFeed", clientIp(req)))) return;

  const token = feedTokenFromPath(req.query.token);
  if (!token) return res.status(404).json({ error: "Nie znaleziono." });

  const admin = supabaseAdmin();
  const { data: row, error: tokenError } = await admin
    .from("calendar_feed_tokens")
    .select("user_id")
    .eq("token_hash", hashFeedToken(token))
    .maybeSingle<{ user_id: string }>();
  if (tokenError) {
    console.error("[calendar/feed] token:", tokenError.message);
    return res.status(503).json({ error: "Usługa chwilowo niedostępna." });
  }
  if (!row) return res.status(404).json({ error: "Nie znaleziono." });
  const userId = row.user_id;

  const today = getAppDate();
  const { from, to } = feedRange(today);
  try {
    const owned = ownedOrSharedFilter("user_id", "shared_with_id", userId);
    const [events, tasks, schemas, choices, overrides] = await Promise.all([
      // Wydarzenia cykliczne mogą zaczynać się przed zakresem – bez dolnej granicy startu.
      admin.from("events").select(cols("events")).or(owned).lte("start_time", `${to}T23:59:59+00`),
      admin
        .from("tasks")
        .select(cols("tasks"))
        .or(ownedOrSharedFilter("user_id", "for_user_id", userId))
        .gte("due_date", from)
        .lte("due_date", to),
      admin.from("day_schemas").select(cols("day_schemas")).eq("user_id", userId),
      admin
        .from("day_schema_choices")
        .select("date, schema_id")
        .eq("user_id", userId)
        .gte("date", from)
        .lte("date", to),
      admin
        .from("daily_overrides")
        .select(cols("daily_overrides"))
        .eq("user_id", userId)
        .gte("date", from)
        .lte("date", to),
    ]);
    const failed = [events, tasks, schemas, choices, overrides].find((r) => r.error);
    if (failed?.error) throw failed.error;

    const overridesByDay = new Map<string, DailyOverride[]>();
    for (const o of (overrides.data ?? []) as Array<DailyOverride & { date: string }>) {
      overridesByDay.set(o.date, [...(overridesByDay.get(o.date) ?? []), o]);
    }
    const ics = buildCalendarFeed({
      events: (events.data ?? []) as Event[],
      tasks: (tasks.data ?? []) as Task[],
      schemas: (schemas.data ?? []) as Schema[],
      schemaChoices: new Map(
        ((choices.data ?? []) as Array<{ date: string; schema_id: string | null }>).map((c) => [c.date, c.schema_id])
      ),
      overrides: overridesByDay,
      from,
      to,
      now: new Date(),
      uidDomain: UID_DOMAIN,
    });

    await admin.from("calendar_feed_tokens").update({ last_used_at: new Date().toISOString() }).eq("user_id", userId);
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'inline; filename="dzisiaj.ics"');
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).send(req.method === "HEAD" ? "" : ics);
  } catch (err) {
    console.error("[calendar/feed]", err instanceof Error ? err.message : "nieznany błąd");
    return res.status(503).json({ error: "Usługa chwilowo niedostępna." });
  }
}
