// supabase/functions/process-reminders/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { verifyCronSecret, jsonHeaders, corsHeaders, unauthorized } from "../_shared/auth.ts";
import { getErrorMessage } from "../_shared/errors.ts";
import { mapPool } from "../_shared/asyncPool.ts";
import { nextOccurrenceAfter, normalizeRule, type RecurrenceRule } from "../_shared/recurrence.ts";

interface RecurringTask {
  id: number;
  title: string;
  due_date: string | null;
  done_at: string | null;
  repeat_days: number | null;
  recurring_until: string | null;
  recurrence?: unknown;
}

type RollOutcome = "skipped" | "finished" | "rolled" | "failed";

function resolveBaseDate(doneDate: string | null, dueDate: string | null): string | null {
  if (doneDate && dueDate) return doneDate > dueDate ? doneDate : dueDate;
  return doneDate ?? dueDate;
}

/** Reguła zadania: `recurrence`, a dla starszych zadań – co `repeat_days` dni. */
function taskRule(task: RecurringTask): RecurrenceRule | null {
  const rule = normalizeRule(task.recurrence);
  if (rule) return rule;
  if (task.repeat_days && task.repeat_days > 0) {
    return { freq: "daily", interval: task.repeat_days, until: task.recurring_until };
  }
  return null;
}

/**
 * Następny termin po wykonaniu. Kotwicą reguły jest dotychczasowy termin
 * (to wystąpienie reguły), a szukamy po dniu późniejszym z: terminu i dnia
 * wykonania – zadanie zrobione z opóźnieniem nie „nadrabia” zaległych terminów.
 */
export function nextDueDate(task: RecurringTask): string | null | undefined {
  const rule = taskRule(task);
  if (!rule) return undefined;
  const doneDate = task.done_at ? task.done_at.slice(0, 10) : null;
  const base = resolveBaseDate(doneDate, task.due_date);
  if (!base) return undefined;
  return nextOccurrenceAfter(task.due_date ?? base, rule, base);
}

async function rollRecurringTask(
  supabase: ReturnType<typeof createClient>,
  task: RecurringTask
): Promise<RollOutcome> {
  const nextDue = nextDueDate(task);
  if (nextDue === undefined) return "skipped";

  if (nextDue === null) {
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
      .select("*") // „*”: kolumna recurrence może jeszcze nie istnieć przed migracją
      .eq("is_recurring", true)
      .eq("status", "done");
    if (error) throw error;

    const rolled: string[] = [];
    const finished: string[] = [];
    const failed: string[] = [];

    await mapPool((data ?? []) as RecurringTask[], 5, async (task) => {

      try {
        const outcome = await rollRecurringTask(supabase, task);
        if (outcome === "rolled") rolled.push(task.title);
        else if (outcome === "finished") finished.push(task.title);
        else if (outcome === "failed") failed.push(task.title);
      } catch (taskErr) {
        console.error("process-reminders: task failed", task.id, taskErr);
        failed.push(task.title);
      }
    });

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