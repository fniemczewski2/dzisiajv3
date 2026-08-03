// lib/server/slackLists.ts

import { fetchWithTimeout } from "@/lib/server/fetchWithTimeout";
import { SLACK_API_BASE, SLACK_REQUEST_TIMEOUT_MS, SLACK_ITEMS_PAGE_SIZE } from "@/config/slack";

export type SlackColumnType = "text" | "number" | "date" | "select" | "user" | "channel";

export interface SlackColumn {
  id: string;
  name: string;
  type: SlackColumnType | string;
  options?: { choices?: { value: string; label: string }[] };
}

export interface SlackListSummary {
  id: string;
  title: string;
}

export interface SlackApiError extends Error {
  slackError?: string;
  retryAfterSeconds?: number;
}

interface SlackResponse<T> {
  ok: boolean;
  error?: string;
  response_metadata?: { next_cursor?: string };
  data?: T;
}

function slackError(message: string, code?: string, retryAfterSeconds?: number): SlackApiError {
  const error = new Error(message) as SlackApiError;
  error.slackError = code;
  error.retryAfterSeconds = retryAfterSeconds;
  return error;
}

async function callSlack<T>(
  method: string,
  token: string,
  payload: Record<string, unknown>
): Promise<T & SlackResponse<T>> {
  const response = await fetchWithTimeout(
    `${SLACK_API_BASE}/${method}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    },
    SLACK_REQUEST_TIMEOUT_MS
  );

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("Retry-After") ?? "30");
    throw slackError("Przekroczono limit zapytań do Slacka.", "ratelimited", retryAfter);
  }

  const body = (await response.json()) as T & SlackResponse<T>;

  if (!body.ok) {
    throw slackError(translateSlackError(body.error), body.error);
  }
  return body;
}

export function translateSlackError(code: string | undefined): string {
  if (!code) return "Slack odrzucił żądanie.";
  switch (code) {
    case "invalid_auth":
    case "token_revoked":
    case "account_inactive":
      return "Połączenie ze Slackiem wygasło. Połącz konto ponownie.";
    case "missing_scope":
      return "Aplikacja nie ma uprawnień lists:read / lists:write.";
    case "invalid_column_id":
      return "Mapowanie kolumn jest nieaktualne - lista w Slacku zmieniła strukturę.";
    case "invalid_input_type":
      return "Typ kolumny w Slacku nie pasuje do pola zadania.";
    case "over_row_maximum":
      return "Lista w Slacku osiągnęła maksymalną liczbę pozycji.";
    case "over_cell_fields_limit":
      return "Za dużo wartości w jednym polu listy.";
    case "not_allowed_token_type":
    case "team_not_found":
      return "Slack Lists wymagają płatnego planu Slacka.";
    default:
      return `Slack odrzucił żądanie (${code}).`;
  }
}

function toRichText(value: string) {
  return [
    {
      type: "rich_text",
      elements: [{ type: "rich_text_section", elements: [{ type: "text", text: value }] }],
    },
  ];
}

export interface SlackFieldValue {
  column_id: string;
  rich_text?: ReturnType<typeof toRichText>;
  number?: number[];
  date?: string[];
  select?: string[];
}

export function buildFieldValue(
  column: SlackColumn,
  rawValue: string | number | null | undefined
): SlackFieldValue | null {
  if (rawValue === null || rawValue === undefined || rawValue === "") return null;

  switch (column.type) {
    case "number": {
      const parsed = Number(rawValue);
      return Number.isNaN(parsed) ? null : { column_id: column.id, number: [parsed] };
    }
    case "date": {
      const asText = String(rawValue).slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(asText) ? { column_id: column.id, date: [asText] } : null;
    }
    case "select": {
      const label = String(rawValue).toLowerCase();
      const choice = column.options?.choices?.find(
        (c) => c.label.toLowerCase() === label || c.value.toLowerCase() === label
      );
      return choice ? { column_id: column.id, select: [choice.value] } : null;
    }
    case "user":
    case "channel":
      return null;
    default:
      return { column_id: column.id, rich_text: toRichText(String(rawValue)) };
  }
}

export interface SlackItemField {
  column_id?: string;
  key?: string;
  text?: string;
  rich_text?: unknown[];
  number?: number[];
  date?: string[];
  select?: string[];
  value?: string | number | boolean | null;
}

export interface SlackItem {
  id: string;
  updated_timestamp?: string;
  fields?: SlackItemField[];
}

export async function listItems(
  token: string,
  listId: string
): Promise<{ items: SlackItem[]; columns: SlackColumn[] }> {
  const items: SlackItem[] = [];
  let cursor: string | undefined;

  do {
    const body = await callSlack<{ items?: SlackItem[] }>("slackLists.items.list", token, {
      list_id: listId,
      limit: SLACK_ITEMS_PAGE_SIZE,
      ...(cursor ? { cursor } : {}),
    });

    items.push(...(body.items ?? []));
    cursor = body.response_metadata?.next_cursor || undefined;
  } while (cursor);

  const columns = await listColumns(token, listId);
  return { items, columns };
}

export function readFieldValue(field: SlackItemField): string | null {
  if (field.date?.length) return field.date[0];
  if (field.number?.length) return String(field.number[0]);
  if (field.select?.length) return field.select[0];
  if (typeof field.text === "string" && field.text !== "") return field.text;
  if (field.value !== null && field.value !== undefined) return String(field.value);
  return null;
}

interface RawSlackColumn {
  id?: string;
  key?: string;
  name?: string;
  type?: string;
  options?: { choices?: { value: string; label: string }[] };
}

function normalizeColumn(raw: RawSlackColumn): SlackColumn | null {
  const id = raw.id ?? raw.key;
  if (!id) return null;
  return {
    id,
    name: raw.name ?? id,
    type: raw.type ?? "text",
    options: raw.options,
  };
}

export async function listColumns(token: string, listId: string): Promise<SlackColumn[]> {
  const body = await callSlack<{ columns?: RawSlackColumn[] }>(
    "slackLists.columns.list",
    token,
    { list_id: listId }
  );
  return (body.columns ?? [])
    .map(normalizeColumn)
    .filter((column): column is SlackColumn => column !== null);
}

export async function createItem(
  token: string,
  listId: string,
  fields: SlackFieldValue[]
): Promise<string> {
  const body = await callSlack<{ item?: { id?: string } }>("slackLists.items.create", token, {
    list_id: listId,
    initial_fields: fields,
  });
  const itemId = body.item?.id;
  if (!itemId) throw slackError("Slack nie zwrócił identyfikatora pozycji.");
  return itemId;
}

export async function updateItem(
  token: string,
  listId: string,
  itemId: string,
  fields: SlackFieldValue[]
): Promise<void> {
  await callSlack("slackLists.items.update", token, {
    list_id: listId,
    id: itemId,
    cells: fields,
  });
}

export async function deleteItem(token: string, listId: string, itemId: string): Promise<void> {
  await callSlack("slackLists.items.delete", token, { list_id: listId, id: itemId });
}