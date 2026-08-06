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
  "inne",
  "cykliczne",
  "terminy"
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const DEFAULT_TASK_CATEGORY: TaskCategory = "inne";
export const RECURRING_TASK_CATEGORY: TaskCategory = "cykliczne";
export const DEFAULT_REPEAT_DAYS = 7;

export const MEETING_POLL_TASK_CATEGORY = "terminy";
export const MEETING_POLL_TASK_TITLE = "Ankieta spotkania";
export const MEETING_POLL_TASK_PRIORITY = 3;
