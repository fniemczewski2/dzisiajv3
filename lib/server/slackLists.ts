// lib/server/slackLists.ts

import { fetchWithTimeout } from "@/lib/server/fetchWithTimeout";
import {
  SLACK_API_BASE,
  SLACK_REQUEST_TIMEOUT_MS,
  SLACK_ITEMS_PAGE_SIZE,
  SLACK_RATE_LIMIT_RETRIES,
  SLACK_RATE_LIMIT_MAX_WAIT_MS,
  SLACK_ASSIGNEE_COLUMN_TYPES,
  SLACK_ASSIGNEE_NAME_HINTS,
  SLACK_MISSING_ITEM_ERRORS,
  statusSynonyms,
} from "@/config/slack";

export interface SlackColumn {
  id: string;
  key?: string;
  name: string;
  type: string;
  options?: { choices?: { value: string; label: string }[] };
}

export interface SlackApiError extends Error {
  slackError?: string;
  retryAfterSeconds?: number;
}

interface SlackEnvelope {
  ok: boolean;
  error?: string;
  response_metadata?: { next_cursor?: string };
}

function slackError(message: string, code?: string, retryAfterSeconds?: number): SlackApiError {
  const error = new Error(message) as SlackApiError;
  error.slackError = code;
  error.retryAfterSeconds = retryAfterSeconds;
  return error;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function requestSlack<T>(send: () => Promise<Response>): Promise<T & SlackEnvelope> {
  for (let attempt = 0; ; attempt += 1) {
    const response = await send();

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? "30") || 30;
      if (attempt < SLACK_RATE_LIMIT_RETRIES) {
        await sleep(Math.min(retryAfter * 1000, SLACK_RATE_LIMIT_MAX_WAIT_MS));
        continue;
      }
      throw slackError("Przekroczono limit zapytań do Slacka.", "ratelimited", retryAfter);
    }

    const body = (await response.json()) as T & SlackEnvelope;
    if (!body.ok) throw slackError(translateSlackError(body.error), body.error);
    return body;
  }
}

async function callSlack<T>(
  method: string,
  token: string,
  payload: Record<string, unknown>
): Promise<T & SlackEnvelope> {
  return requestSlack<T>(() =>
    fetchWithTimeout(
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
    )
  );
}

async function callSlackQuery<T>(
  method: string,
  token: string,
  params: Record<string, string>
): Promise<T & SlackEnvelope> {
  const query = new URLSearchParams(params).toString();
  return requestSlack<T>(() =>
    fetchWithTimeout(
      `${SLACK_API_BASE}/${method}?${query}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
      SLACK_REQUEST_TIMEOUT_MS
    )
  );
}

export function translateSlackError(code: string | undefined): string {
  if (!code) return "Slack odrzucił żądanie.";
  switch (code) {
    case "invalid_auth":
    case "token_expired":
    case "token_revoked":
    case "account_inactive":
    case "not_authed":
      return "Połączenie ze Slackiem wygasło. Połącz konto ponownie.";
    case "missing_scope":
    case "not_allowed_token_type":
      return "Aplikacja nie ma wymaganych uprawnień (lists:read, lists:write, files:read). Połącz konto ponownie.";
    case "unknown_method":
    case "method_deprecated":
    case "deprecated_endpoint":
      return "Ta funkcja Slack API jest niedostępna. Zaktualizuj integrację.";
    case "list_not_found":
    case "file_not_found":
      return "Nie znaleziono listy w Slacku. Sprawdź link lub uprawnienia do listy.";
    case "record_not_found":
    case "row_not_found":
    case "invalid_row_id":
      return "Pozycja listy nie istnieje już w Slacku.";
    case "invalid_column_id":
    case "column_not_found":
      return "Mapowanie kolumn jest nieaktualne - lista w Slacku zmieniła strukturę.";
    case "invalid_arguments":
    case "invalid_arg_name":
      return "Slack odrzucił parametry zapytania. Zaktualizuj integrację.";
    case "invalid_input_type":
    case "invalid_option_id":
      return "Typ kolumny w Slacku nie pasuje do pola zadania.";
    case "uneditable_column":
      return "Tej kolumny w Slacku nie da się edytować przez API.";
    case "over_row_maximum":
      return "Lista w Slacku osiągnęła maksymalną liczbę pozycji.";
    case "over_cell_fields_limit":
      return "Za dużo wartości w jednym polu listy.";
    case "permission_denied":
    case "access_denied":
    case "no_permission":
      return "Brak uprawnień do tej listy w Slacku.";
    case "team_not_found":
      return "Slack Lists wymagają płatnego planu Slacka.";
    case "ratelimited":
      return "Przekroczono limit zapytań do Slacka. Spróbuj ponownie za chwilę.";
    default:
      return `Slack odrzucił żądanie (${code}).`;
  }
}

type ColumnFamily = "text" | "number" | "date" | "select" | "checkbox" | "unsupported";

const COLUMN_FAMILIES: Record<string, ColumnFamily> = {
  text: "text",
  rich_text: "text",
  number: "number",
  rating: "number",
  date: "date",
  due_date: "date",
  todo_due_date: "date",
  select: "select",
  multi_select: "select",
  checkbox: "checkbox",
  completed: "checkbox",
  todo_completed: "checkbox",
};

export function columnFamily(type: string): ColumnFamily {
  return COLUMN_FAMILIES[type] ?? (type ? "unsupported" : "text");
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
    key: raw.key,
    name: raw.name ?? raw.key ?? id,
    type: raw.type ?? "text",
    options: raw.options,
  };
}

export async function listColumns(token: string, listId: string): Promise<SlackColumn[]> {
  const body = await callSlackQuery<{
    file?: { list_metadata?: { schema?: RawSlackColumn[] } };
  }>("files.info", token, { file: listId });

  return (body.file?.list_metadata?.schema ?? [])
    .map(normalizeColumn)
    .filter((column): column is SlackColumn => column !== null);
}

function inferColumns(items: SlackItem[]): SlackColumn[] {
  const found = new Map<string, SlackColumn>();

  for (const item of items) {
    for (const field of item.fields ?? []) {
      const id = field.column_id ?? field.key;
      if (!id || found.has(id)) continue;
      let type = "text";
      if (field.date?.length) type = "date";
      else if (field.number?.length) type = "number";
      else if (field.select?.length) type = "select";
      else if (field.checkbox !== undefined) type = "checkbox";
      found.set(id, { id, key: field.key, name: field.key ?? id, type });
    }
  }
  return [...found.values()];
}

const FATAL_SCHEMA_ERRORS = new Set([
  "invalid_auth",
  "token_expired",
  "token_revoked",
  "account_inactive",
  "not_authed",
  "ratelimited",
]);

function canFallBackFromSchemaError(err: unknown): boolean {
  const code = (err as SlackApiError).slackError;
  return !code || !FATAL_SCHEMA_ERRORS.has(code);
}

export async function listColumnsSafe(
  token: string,
  listId: string,
  items?: SlackItem[]
): Promise<SlackColumn[]> {
  try {
    const columns = await listColumns(token, listId);
    if (columns.length > 0) return columns;
  } catch (err) {
    if (!canFallBackFromSchemaError(err)) throw err;
    console.warn(
      `[slackLists] files.info nie zwrócił schematu listy ${listId}, odtwarzam kolumny z pozycji:`,
      (err as Error).message
    );
  }
  return inferColumns(items ?? (await fetchAllItems(token, listId)));
}

export function findAssigneeColumn(columns: SlackColumn[]): SlackColumn | null {
  const supported = columns.filter((c) =>
    (SLACK_ASSIGNEE_COLUMN_TYPES as readonly string[]).includes(c.type)
  );

  const byType = supported.find((c) => c.type === "todo_assignee" || c.type === "assignee");
  if (byType) return byType;

  return (
    supported.find((column) => {
      const label = `${column.name} ${column.key ?? ""}`.toLowerCase();
      return SLACK_ASSIGNEE_NAME_HINTS.some((hint) => label.includes(hint));
    }) ?? null
  );
}

export function buildAssigneeValue(
  column: SlackColumn,
  slackUserId: string | null | undefined
): SlackFieldValue | null {
  if (!slackUserId) return null;
  return { column_id: column.id, user: [slackUserId] };
}

export interface SlackItemField {
  column_id?: string;
  key?: string;
  text?: string;
  rich_text?: unknown[];
  number?: number[];
  date?: string[];
  select?: string[];
  // Slack zwraca checkbox jako zwykły boolean (nie tablicę, jak pozostałe typy).
  checkbox?: boolean | boolean[];
  user?: string[];
  value?: string | number | boolean | null;
}

export interface SlackItem {
  id: string;
  updated_timestamp?: string;
  fields?: SlackItemField[];
}

async function fetchAllItems(token: string, listId: string): Promise<SlackItem[]> {
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

  return items;
}

export async function listItems(
  token: string,
  listId: string
): Promise<{ items: SlackItem[]; columns: SlackColumn[] }> {
  const items = await fetchAllItems(token, listId);
  const columns = await listColumnsSafe(token, listId, items);
  return { items, columns };
}

export async function itemExists(
  token: string,
  listId: string,
  itemId: string
): Promise<boolean> {
  try {
    await callSlack("slackLists.items.info", token, { list_id: listId, id: itemId });
    return true;
  } catch (err) {
    const code = (err as SlackApiError).slackError;
    if (code === "record_not_found" || code === "row_not_found" || code === "invalid_row_id") {
      return false;
    }
    throw err;
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
  checkbox?: boolean;
  user?: string[];
}

function canonical(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function matchChoice(column: SlackColumn, rawValue: string): string | null {
  const choices = column.options?.choices ?? [];
  if (choices.length === 0) return null;

  const candidates = [rawValue, ...statusSynonyms(rawValue)].map(canonical);
  for (const candidate of candidates) {
    const hit = choices.find(
      (choice) => canonical(choice.value) === candidate || canonical(choice.label) === candidate
    );
    if (hit) return hit.value;
  }
  return null;
}

export function buildFieldValue(
  column: SlackColumn,
  rawValue: string | number | null | undefined
): SlackFieldValue | null {
  if (rawValue === null || rawValue === undefined || rawValue === "") return null;

  switch (columnFamily(column.type)) {
    case "number": {
      const parsed = Number(rawValue);
      return Number.isNaN(parsed) ? null : { column_id: column.id, number: [parsed] };
    }
    case "date": {
      const asText = String(rawValue).slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(asText) ? { column_id: column.id, date: [asText] } : null;
    }
    case "select": {
      const choice = matchChoice(column, String(rawValue));
      return choice ? { column_id: column.id, select: [choice] } : null;
    }
    case "checkbox": {
      const asText = String(rawValue).trim().toLowerCase();
      const checked = ["done", "true", "1", "completed", "zrobione", "gotowe"].includes(asText);
      return { column_id: column.id, checkbox: checked };
    }
    case "text":
      return { column_id: column.id, rich_text: toRichText(String(rawValue)) };
    case "unsupported":
      return null;
  }
}

function readCheckbox(field: SlackItemField): boolean | null {
  if (typeof field.checkbox === "boolean") return field.checkbox;
  if (Array.isArray(field.checkbox) && field.checkbox.length > 0) {
    return Boolean(field.checkbox[0]);
  }
  if (typeof field.value === "boolean") return field.value;
  if (field.value === "true" || field.value === "false") return field.value === "true";
  return null;
}

export function readFieldValue(
  field: SlackItemField,
  column?: SlackColumn
): string | null {
  if (column && columnFamily(column.type) === "checkbox") {
    const checked = readCheckbox(field);
    return checked === null ? null : checked ? "done" : "pending";
  }

  if (field.date?.length) return field.date[0];
  if (field.number?.length) return String(field.number[0]);

  const checked = readCheckbox(field);
  if (checked !== null) return checked ? "done" : "pending";

  if (field.select?.length) {
    const optionId = field.select[0];
    const label = column?.options?.choices?.find((c) => c.value === optionId)?.label;
    return label ?? optionId;
  }
  if (typeof field.text === "string" && field.text !== "") return field.text;
  if (field.value !== null && field.value !== undefined) return String(field.value);
  return null;
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
  if (fields.length === 0) return;

  await callSlack("slackLists.items.update", token, {
    list_id: listId,
    cells: fields.map((field) => ({ ...field, row_id: itemId })),
  });
}

export async function deleteItem(token: string, listId: string, itemId: string): Promise<void> {
  await callSlack("slackLists.items.delete", token, { list_id: listId, id: itemId });
}

export function isMissingItemError(err: unknown): boolean {
  const code = (err as SlackApiError).slackError;
  return code !== undefined && SLACK_MISSING_ITEM_ERRORS.has(code);
}