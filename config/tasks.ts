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
  "inne",
  "SLACK",
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const DEFAULT_TASK_CATEGORY: TaskCategory = "inne";
