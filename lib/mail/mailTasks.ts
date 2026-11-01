// lib/mail/mailTasks.ts
//
// Wiersz zadania utworzonego z wiadomości. Treść wiadomości NIE trafia do zadania;
// zapisujemy wyłącznie nadawcę, żeby zadanie wskazywało źródło.

import { DEFAULT_TASK_PRIORITY } from "@/config/defaults";
import { MAIL_TASK_CATEGORY } from "@/config/tasks";
import { replyTaskTitle } from "@/lib/mail/tasks";

export interface MailTaskRow {
  title: string;
  category: string;
  priority: number;
  description: string;
  due_date: string;
  status: "pending";
  user_id: string;
}

/** Dzień po „YYYY-MM-DD” – zadania z poczty domyślnie na jutro. */
export function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function buildMailTaskRow(input: { subject: string; from: string; userId: string; today: string }): MailTaskRow {
  return {
    title: replyTaskTitle(input.subject),
    category: MAIL_TASK_CATEGORY,
    priority: DEFAULT_TASK_PRIORITY,
    description: `Od: ${input.from}`.slice(0, 500),
    due_date: nextDay(input.today),
    status: "pending",
    user_id: input.userId,
  };
}
