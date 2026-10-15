// supabase/functions/process-reminders/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { verifyCronSecret, jsonHeaders, corsHeaders, unauthorized } from "../_shared/auth.ts";
import { getErrorMessage } from "../_shared/errors.ts";
import { mapPool } from "../_shared/asyncPool.ts";
import { nextOccurrenceAfter, normalizeRule, withMonthDay, type RecurrenceRule } from "../_shared/recurrence.ts";
import { BILL_TASK_CATEGORY, billTaskTitle, isBillDueOn } from "../_shared/bills.ts";

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

/**
 * Reguła zadania: `recurrence`, a dla starszych zadań – co `repeat_days` dni.
 * Reguła „dzień miesiąca” bez zapisanego dnia dostaje go z obecnego terminu,
 * zanim termin się przesunie (inaczej „31.” po lutym zostałoby „28.”).
 */
function taskRule(task: RecurringTask): RecurrenceRule | null {
  const rule = normalizeRule(task.recurrence);
  if (rule) return rule.monthDay ? rule : withMonthDay(rule, task.due_date);
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

  // Reguła z utrwalonym dniem miesiąca (dla zadań sprzed tej zmiany).
  const rule = normalizeRule(task.recurrence);
  const fixedRule = rule && !rule.monthDay ? taskRule(task) : null;
  const { error: rollError } = await supabase
    .from("tasks")
    .update({ status: "pending", due_date: nextDue, ...(fixedRule?.monthDay ? { recurrence: fixedRule } : {}) })
    .eq("id", task.id);
  return rollError ? "failed" : "rolled";
}

interface RecurringBillRow {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  start_date: string;
  recurrence: unknown;
  active: boolean;
}

/** Dzisiejsza data w Polsce (yyyy-MM-dd). */
function todayInPoland(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
}

/**
 * Zadania „Zapłać: …” dla rachunków stałych z terminem dziś. Pomijamy
 * rachunki, które w tym miesiącu mają już powiązaną płatność (np. polecenie
 * zapłaty zaimportowane z banku przed terminem). Unikalny indeks
 * (recurring_bill_id, bill_due_date) chroni przed duplikatem przy ponownym
 * uruchomieniu.
 */
async function createBillTasks(supabase: ReturnType<typeof createClient>, today: string): Promise<number> {
  const { data: bills, error } = await supabase.from("recurring_bills").select("*").eq("active", true);
  if (error) {
    // Tabela jeszcze nie istnieje (przed migracją 1.40) – nic do zrobienia.
    console.warn("process-reminders: recurring_bills", error.message);
    return 0;
  }
  const due = ((bills ?? []) as RecurringBillRow[]).filter((b) => isBillDueOn(b, today));
  if (due.length === 0) return 0;

  const monthStart = `${today.slice(0, 7)}-01`;
  const { data: paid } = await supabase
    .from("transactions")
    .select("recurring_bill_id")
    .in("recurring_bill_id", due.map((b) => b.id))
    .gte("date", monthStart)
    .lte("date", today);
  const paidIds = new Set((paid ?? []).map((p: { recurring_bill_id: string }) => p.recurring_bill_id));

  const rows = due
    .filter((b) => !paidIds.has(b.id))
    .map((b) => ({
      title: billTaskTitle(b.name),
      description: `${Number(b.amount).toFixed(2)} zł`,
      category: BILL_TASK_CATEGORY,
      priority: 2,
      due_date: today,
      status: "pending",
      user_id: b.user_id,
      for_user_id: b.user_id,
      recurring_bill_id: b.id,
      bill_due_date: today,
    }));
  if (rows.length === 0) return 0;
  const { error: insertError } = await supabase
    .from("tasks")
    .upsert(rows, { onConflict: "recurring_bill_id,bill_due_date", ignoreDuplicates: true });
  if (insertError) console.error("process-reminders: bill tasks", insertError.message);
  return insertError ? 0 : rows.length;
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

    const billTasks = await createBillTasks(supabase, todayInPoland());

    return new Response(
      JSON.stringify({ success: true, rolled, finished, failed, billTasks }),
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