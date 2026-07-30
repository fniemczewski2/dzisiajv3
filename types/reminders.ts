// types/reminders.ts

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  start_date: string;
  repeat_days: number;
  done: string | null;
}
