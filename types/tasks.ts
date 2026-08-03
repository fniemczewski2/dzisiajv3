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
  status: "pending" | "done" | "waiting_for_acceptance";
  scheduled_time?: string | null;
  user_id: string;
  created_at?: string;
  updated_at?: string;
  done_at?: string | null;
  is_recurring?: boolean;
  repeat_days?: number | null;
  recurring_until?: string | null;
}