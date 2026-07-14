
export interface ScheduleItem {
  id?: string;
  time: string;
  label: string;
  notify?: boolean;
}

export interface Schema {
  id?: string;
  user_id?: string;
  name: string;
  days: number[];
  entries: ScheduleItem[];
  created_at?: string;
}

export interface PlanItemData {
  id: string;
  title: string;
  type: "event" | "schema" | "task" | "worklog";
  data?: any;
}

export type DailyOverride = {
  schema_id: string;
  new_time?: string | null;
  is_hidden: boolean;
};