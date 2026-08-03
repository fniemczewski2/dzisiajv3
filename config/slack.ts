// config/slack.ts

export const SLACK_API_BASE = "https://slack.com/api";
export const SLACK_AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize";
export const SLACK_STATE_COOKIE = "slack_oauth_state";
export const SLACK_STATE_TTL_SECONDS = 600;

export const SLACK_USER_SCOPES = ["lists:read", "lists:write"] as const;

export const SLACK_REQUEST_TIMEOUT_MS = 15_000;
export const SLACK_ITEMS_PAGE_SIZE = 100;

export const SLACK_MAPPABLE_TASK_FIELDS = [
  "title",
  "description",
  "due_date",
  "category",
  "priority",
  "status",
] as const;

export type SlackMappableTaskField = (typeof SLACK_MAPPABLE_TASK_FIELDS)[number];

export const SLACK_FIELD_LABELS: Record<SlackMappableTaskField, string> = {
  title: "Tytuł",
  description: "Opis",
  due_date: "Termin",
  category: "Kategoria",
  priority: "Priorytet",
  status: "Status",
};

export const SLACK_TASK_CATEGORY = "slack";

export const SLACK_PULL_EXCLUDED_FIELDS: readonly SlackMappableTaskField[] = ["category"];
