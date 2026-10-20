// lib/reportToTasks.ts
//
// Zadania z protokołu → zadania w aplikacji. Każde utworzone zadanie zapisuje
// swój identyfikator w protokole (tasks[i].app_task_id), więc nie da się go
// dodać drugi raz, a lista pokazuje, co już jest w Zadaniach.

import { DEFAULT_TASK_PRIORITY } from "@/config/defaults";
import type { Report, ReportTask } from "@/types/reports";
import { formatReportDate } from "./reportExport";

export interface ReportTaskChoice {
  index: number;
  task: ReportTask;
  added: boolean;
}

/** Zadania protokołu z treścią, z informacją, czy są już w aplikacji. */
export function reportTaskChoices(report: Report): ReportTaskChoice[] {
  return (report.tasks ?? [])
    .map((task, index) => ({ index, task, added: Boolean(task.app_task_id) }))
    .filter((c) => c.task.zadanie?.trim());
}

export interface NewAppTask {
  title: string;
  description: string;
  category: string;
  priority: number;
  due_date: string;
  status: "pending";
  user_id: string;
  for_user_id: string;
}

/**
 * Wiersz zadania: tytuł z treści, termin z protokołu (albo `fallbackDue`),
 * w opisie – skąd pochodzi i kto odpowiada.
 */
export function toAppTask(
  report: Report,
  task: ReportTask,
  opts: { userId: string; category: string; fallbackDue: string }
): NewAppTask {
  const source = `Z protokołu „${report.topic?.trim() || "spotkanie"}” z ${formatReportDate(report.date)}.`;
  const owner = task.osoba?.trim() ? ` Odpowiada: ${task.osoba.trim()}.` : "";
  return {
    title: task.zadanie.trim().slice(0, 200),
    description: `${source}${owner}`,
    category: opts.category,
    priority: DEFAULT_TASK_PRIORITY,
    due_date: task.data?.slice(0, 10) || opts.fallbackDue,
    status: "pending",
    user_id: opts.userId,
    for_user_id: opts.userId,
  };
}

/** Protokół z zapisanymi id zadań utworzonych w aplikacji. */
export function withAppTaskIds(tasks: readonly ReportTask[], created: ReadonlyMap<number, string>): ReportTask[] {
  return tasks.map((t, i) => (created.has(i) ? { ...t, app_task_id: created.get(i) } : t));
}
