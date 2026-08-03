// config/tasks.ts

export const TASK_CATEGORIES = [
  "edukacja",
  "praca",
  "osobiste",
  "aktywizm",
  "przyjaciele",
  "zakupy",
  "podróże",
  "trening",
  "slack",
  "cykliczne",
  "inne",
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const DEFAULT_TASK_CATEGORY: TaskCategory = "inne";
export const RECURRING_TASK_CATEGORY: TaskCategory = "cykliczne";
export const DEFAULT_REPEAT_DAYS = 7;
