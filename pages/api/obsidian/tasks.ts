// pages/api/obsidian/tasks.ts
//
// Obsidian ↔ zadania, tokenem Skrótów (jak szybkie notatki). Bez sesji – wywołania z Templatera / QuickAdd.
// GET  ?date=RRRR-MM-DD (domyślnie dziś, czas polski) → { date, markdown, tasks, events } – plan dnia do notatki
//      dziennej. Wydarzenia: tylko jednorazowe zaczynające się w tym dniu (cykliczne pokazuje kanał .ics).
// POST { text: "- [ ] Tytuł 📅 2026-11-20 ⏫ #kategoria\n…" } albo { tasks: ["…"] } → nowe zadania (status pending).

import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods } from "@/lib/server/apiGuards";
import { clientIp, enforceRateLimit } from "@/lib/server/rateLimit";
import { looksLikeShortcutToken } from "@/lib/server/shortcutTokens";
import { extractShortcutToken, resolveShortcutUser } from "@/lib/server/shortcutAuth";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { getAppDate } from "@/lib/dateUtils";
import { ownedOrSharedFilter } from "@/lib/postgrestFilters";
import { dayPlanMarkdown, readObsidianTasks } from "@/lib/obsidianTasks";
import type { Task } from "@/types/tasks";
import type { Event } from "@/types/events";

export const config = { api: { bodyParser: { sizeLimit: "16kb" } } };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (!allowMethods(req, res, ["GET", "POST"])) return;
  if (!(await enforceRateLimit(res, "obsidianTasks", clientIp(req)))) return;

  const token = extractShortcutToken(req);
  if (!looksLikeShortcutToken(token)) {
    res.status(401).json({ error: "Brak autoryzacji." });
    return;
  }

  const today = getAppDate();
  try {
    const admin = supabaseAdmin();
    const userId = await resolveShortcutUser(admin, token);
    if (!userId) {
      res.status(401).json({ error: "Brak autoryzacji." });
      return;
    }

    if (req.method === "GET") {
      const q = typeof req.query.date === "string" ? req.query.date : today;
      if (!ISO_DATE.test(q)) {
        res.status(400).json({ error: "Nieprawidłowa data." });
        return;
      }
      const [tasks, events] = await Promise.all([
        admin
          .from("tasks")
          .select("title, due_date, priority, status, category")
          .or(ownedOrSharedFilter("user_id", "for_user_id", userId))
          .eq("due_date", q)
          .neq("status", "waiting_for_acceptance"),
        admin
          .from("events")
          .select("title, start_time, end_time, place, repeat, recurrence")
          .or(ownedOrSharedFilter("user_id", "shared_with_id", userId))
          .gte("start_time", `${q}T00:00:00+00`)
          .lte("start_time", `${q}T23:59:59+00`),
      ]);
      if (tasks.error) throw tasks.error;
      if (events.error) throw events.error;
      const oneOff = ((events.data ?? []) as Event[]).filter(
        (e) => !e.recurrence && (!e.repeat || e.repeat === "none")
      );
      const taskRows = (tasks.data ?? []) as Task[];
      res.setHeader("Cache-Control", "private, no-store");
      res.status(200).json({
        date: q,
        markdown: dayPlanMarkdown(q, oneOff, taskRows),
        tasks: taskRows,
        events: oneOff,
      });
      return;
    }

    const drafts = readObsidianTasks(req.body, today);
    if ("error" in drafts) {
      res.status(400).json({ error: drafts.error });
      return;
    }
    const { error } = await admin.from("tasks").insert(
      drafts.map((d) => ({
        user_id: userId,
        title: d.title,
        due_date: d.due_date,
        priority: d.priority,
        category: d.category,
        status: "pending",
      }))
    );
    if (error) throw error;
    const message = drafts.length === 1 ? `Dodano zadanie: ${drafts[0].title}.` : `Dodano zadania: ${drafts.length}.`;
    res.status(201).json({ success: true, count: drafts.length, message });
  } catch (err) {
    console.error("[obsidian/tasks]", err instanceof Error ? err.message : "nieznany błąd");
    res.status(500).json({ error: "Nie udało się przetworzyć zadań. Spróbuj ponownie." });
  }
}
