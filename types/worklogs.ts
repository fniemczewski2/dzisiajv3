export interface WorkLog {
  id: string;
  user_id: string;
  description: string;
  start_time: string;
  end_time?: string;
  created_at?: string;
  updated_at?: string;
}

export type WorkLogInsert = Omit<WorkLog, "id" | "created_at" | "updated_at">;