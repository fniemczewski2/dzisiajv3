// types/schemas.ts

import type { TrackedTrain } from "./transport";
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

export type PlanItemType = "event" | "schema" | "task" | "worklog" | "train";

export interface PlanItemData {
  id: string;
  title: string;
  type: PlanItemType;
  data?: { category?: string; start_time?: string; end_time?: string | null; priority?: number; due_date?: string };
  /** Tylko dla type === "train" – bilet z user_trains. */
  train?: TrackedTrain;
}

export type DailyOverride = {
  schema_id: string;
  new_time?: string | null;
  is_hidden: boolean;
};