// lib/mail/mailTasks.ts
//
// Wiersz zadania utworzonego z wiadomości. Treść wiadomości NIE trafia do zadania;
// zapisujemy wyłącznie nadawcę, żeby zadanie wskazywało źródło.

import { DEFAULT_TASK_PRIORITY } from "@/config/defaults";
import { replyTaskTitle, MAIL_TASK_CATEGORY } from "@/lib/mail/tasks";

export interface MailTaskRow {
  title: string;
  category: string;
  priority: number;
  description: string;
  due_date: string;
  status: "pending";
  user_id: string;
}

export function buildMailTaskRow(input: { subject: string; from: string; userId: string; today: string }): MailTaskRow {
  return {
    title: replyTaskTitle(input.subject),
    category: MAIL_TASK_CATEGORY,
    priority: DEFAULT_TASK_PRIORITY,
    description: `Od: ${input.from}`.slice(0, 500),
    due_date: input.today,
    status: "pending",
    user_id: input.userId,
  };
}
