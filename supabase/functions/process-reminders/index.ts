// supabase/functions/process-reminders/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { verifyCronSecret, jsonHeaders, corsHeaders, unauthorized } from "../_shared/auth.ts";
import { getErrorMessage } from "../_shared/errors.ts";

interface RecurringTask {
  id: number;
  title: string;
  due_date: string | null;
  done_at: string | null;
  repeat_days: number | null;
  recurring_until: string | null;
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

type RollOutcome = "skipped" | "finished" | "rolled" | "failed";

function resolveBaseDate(doneDate: string | null, dueDate: string | null): string | null {
  if (doneDate && dueDate) return doneDate > dueDate ? doneDate : dueDate;
  return doneDate ?? dueDate;
}

async function rollRecurringTask(
  supabase: ReturnType<typeof createClient>,
  task: RecurringTask
): Promise<RollOutcome> {
  if (!task.repeat_days || task.repeat_days <= 0) return "skipped";

  const doneDate = task.done_at ? task.done_at.slice(0, 10) : null;
  const base = resolveBaseDate(doneDate, task.due_date);
  if (!base) return "skipped";

  const nextDue = addDays(base, task.repeat_days);

  if (task.recurring_until && nextDue > task.recurring_until) {
    const { error: stopError } = await supabase
      .from("tasks")
      .update({ is_recurring: false })
      .eq("id", task.id);
    return stopError ? "failed" : "finished";
  }

  const { error: rollError } = await supabase
    .from("tasks")
    .update({ status: "pending", due_date: nextDue })
    .eq("id", task.id);
  return rollError ? "failed" : "rolled";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!verifyCronSecret(req)) return unauthorized();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, due_date, done_at, repeat_days, recurring_until")
      .eq("is_recurring", true)
      .eq("status", "done");
    if (error) throw error;

    const rolled: string[] = [];
    const finished: string[] = [];
    const failed: string[] = [];

    for (const task of (data ?? []) as RecurringTask[]) {
      // Each task is isolated in its own try/catch so a thrown network/DB
      // error on one row (not just a returned `error` field) doesn't abort
      // processing of the remaining recurring tasks in this run.
      try {
        const outcome = await rollRecurringTask(supabase, task);
        if (outcome === "rolled") rolled.push(task.title);
        else if (outcome === "finished") finished.push(task.title);
        else if (outcome === "failed") failed.push(task.title);
      } catch (taskErr) {
        console.error("process-reminders: task failed", task.id, taskErr);
        failed.push(task.title);
      }
    }

    return new Response(
      JSON.stringify({ success: true, rolled, finished, failed }),
      { headers: jsonHeaders }
    );
  } catch (err) {
    console.error("process-reminders:", err);
    return new Response(JSON.stringify({ error: getErrorMessage(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});