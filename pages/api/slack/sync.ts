// pages/api/slack/sync.ts
//
// Thin API-route wrapper: request auth/scoping and the per-user orchestration
// loop live here; the actual sync logic (task<->item mapping, push, pull,
// per-list reconciliation, target/task loading) lives under
// lib/server/slackSync/* — this file used to be 717 lines holding all of it.
//
// `belongsOnList`/`resolveDirection`/`taskUpdatedAt`/`itemUpdatedAt` are
// re-exported so __tests__/lib/server/slackLists.test.ts (which imports them
// from this route path) keeps working unchanged.

import type { NextApiRequest, NextApiResponse } from "next";
import { translateSlackError } from "@/lib/server/slackLists";
import { createServerSupabase } from "@/lib/supabase/server";
import { verifyCronRequest } from "@/lib/server/cronAuth";
import { adminClient, loadTargets, loadTasks } from "@/lib/server/slackSync/targets";
import { syncList } from "@/lib/server/slackSync/syncList";
import type { SyncCounters, SyncTarget } from "@/lib/server/slackSync/types";

export { belongsOnList } from "@/lib/server/slackSync/syncList";
export { resolveDirection, taskUpdatedAt, itemUpdatedAt } from "@/lib/server/slackSync/taskMapping";

export const config = { maxDuration: 60 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const isCron = verifyCronRequest(req);

  const allowedMethod = isCron ? req.method === "GET" || req.method === "POST" : req.method === "POST";
  if (!allowedMethod) return res.status(405).json({ error: "Method Not Allowed" });

  const admin = adminClient();
  let scopedUserId: string | undefined;

  if (!isCron) {
    const supabase = createServerSupabase(req, res);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    scopedUserId = user.id;
  }

  try {
    const targets = await loadTargets(admin, scopedUserId);
    const byUser = new Map<string, SyncTarget[]>();
    for (const target of targets) {
      byUser.set(target.userId, [...(byUser.get(target.userId) ?? []), target]);
    }

    const results: (SyncCounters | { list_id: string; error: string })[] = [];

    for (const [userId, userTargets] of byUser) {
      if (scopedUserId && userId !== scopedUserId) continue;

      const tasks = await loadTasks(admin, userId);

      const listIds = userTargets.map((t) => t.listId);
      const { data: allLinks, error: allLinksError } = await admin
        .from("slack_task_links")
        .select("task_id")
        .in("list_id", listIds);
      if (allLinksError) throw new Error(`slack_task_links: ${allLinksError.message}`);
      const linkedAnywhere = new Set(
        (allLinks ?? []).map((l) => (l as { task_id: number }).task_id)
      );

      const { data: targetRows } = await admin
        .from("slack_task_targets")
        .select("task_id, list_id")
        .eq("user_id", userId);
      const targetListByTask = new Map(
        (targetRows ?? []).map((r) => {
          const row = r as { task_id: number; list_id: string };
          return [row.task_id, row.list_id] as const;
        })
      );

      for (const target of userTargets) {
        try {
          results.push(await syncList(admin, target, tasks, linkedAnywhere, targetListByTask));
        } catch (err) {
          // Błędy spoza Slacka (baza, sieć) mają własny komunikat - nie chowamy
          // ich za ogólnym "Slack odrzucił żądanie."
          const code = (err as { slackError?: string }).slackError;
          let message: string;
          if (code) {
            message = translateSlackError(code);
          } else if (err instanceof Error) {
            message = err.message;
          } else {
            message = String(err);
          }
          console.error(`[slack/sync] lista ${target.listId}:`, err);
          results.push({ list_id: target.listId, error: message });
        }
      }
    }

    const failed = results.filter((r) => "error" in r).length;
    return res
      .status(results.length > 0 && failed === results.length ? 502 : 200)
      .json({ lists: results.length, results });
  } catch (err) {
    console.error("[slack/sync]:", err);
    const detail = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Synchronizacja nie powiodła się: ${detail}` });
  }
}
