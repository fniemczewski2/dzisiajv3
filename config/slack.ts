// config/slack.ts

export const SLACK_API_BASE = "https://slack.com/api";
export const SLACK_AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize";
export const SLACK_STATE_COOKIE = "slack_oauth_state";
export const SLACK_STATE_TTL_SECONDS = 600;
export const SLACK_USER_SCOPES = ["lists:read", "lists:write", "files:read"] as const;

export const SLACK_REQUEST_TIMEOUT_MS = 15_000;
export const SLACK_ITEMS_PAGE_SIZE = 100;
export const SLACK_RATE_LIMIT_RETRIES = 2;
export const SLACK_RATE_LIMIT_MAX_WAIT_MS = 20_000;

export const SLACK_MAPPABLE_TASK_FIELDS = [
  "title",
  "description",
  "due_date",
  "priority",
  "status",
] as const;

export type SlackMappableTaskField = (typeof SLACK_MAPPABLE_TASK_FIELDS)[number];

export const SLACK_FIELD_LABELS: Record<SlackMappableTaskField, string> = {
  title: "Tytuł",
  description: "Opis",
  due_date: "Termin",
  priority: "Priorytet",
  status: "Status",
};

export const SLACK_TASK_CATEGORY = "slack";

export const SLACK_PULL_EXCLUDED_FIELDS: readonly SlackMappableTaskField[] = [];

export const TASK_STATUSES = ["pending", "done", "waiting_for_acceptance"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const DEFAULT_TASK_STATUS: TaskStatus = "pending";


const STATUS_SYNONYMS: Record<TaskStatus, string[]> = {
  done: ["done", "completed", "complete", "finished", "closed", "zrobione", "gotowe", "ukończone"],
  waiting_for_acceptance: [
    "waiting_for_acceptance",
    "waiting",
    "blocked",
    "in_review",
    "review",
    "oczekuje",
    "do akceptacji",
  ],
  pending: ["pending", "not_started", "todo", "to_do", "open", "in_progress", "doing", "nowe", "w toku"],
};

function canonical(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function normalizeTaskStatus(raw: string | null | undefined): TaskStatus | null {
  if (!raw) return null;
  const needle = canonical(raw);
  for (const status of TASK_STATUSES) {
    if (STATUS_SYNONYMS[status].some((synonym) => canonical(synonym) === needle)) return status;
  }
  return null;
}

export function statusSynonyms(status: string): string[] {
  const known = TASK_STATUSES.find((s) => s === status);
  return known ? STATUS_SYNONYMS[known] : [status];
}

export function isDoneStatus(status: string | null | undefined): boolean {
  return normalizeTaskStatus(status) === "done";
}

export const SLACK_ASSIGNEE_COLUMN_TYPES = ["todo_assignee", "assignee", "user"] as const;

export const SLACK_ASSIGNEE_NAME_HINTS = [
  "assignee",
  "owner",
  "przypisan",
  "odpowiedzialn",
  "osoba",
  "wykonawc",
] as const;