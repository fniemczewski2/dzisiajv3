// types/tasks.ts

export interface Task {
  id: string;
  title: string;
  for_user_id?: string | null;
  display_share_info?: string | null;
  category: string;
  priority: number;
  description: string;
  due_date: string;
  status: "pending" | "done" | "accepted" | "waiting_for_acceptance";
  scheduled_time?: string | null;
  user_id: string;
}

export const TASK_COLUMNS =
  "id, user_id, for_user_id, title, description, due_date, due_time, priority, category, done, created_at, status" as const;
