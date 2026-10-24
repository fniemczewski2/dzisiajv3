// supabase/functions/_shared/sharedNotifyRules.ts
//
// Czyste reguły powiadomień o współdzieleniu (bez zależności Deno, testowalne w Vitest).
// Decydują, kto jest odbiorcą i jaki tekst dostanie, na podstawie wiersza z bazy – nie na podstawie
// danych przysłanych przez klienta.

export type SharedKind = "task" | "event" | "list_item";

export interface TaskRow {
  id: string;
  user_id: string;
  for_user_id: string | null;
  title: string;
}

export interface EventRow {
  id: string;
  user_id: string;
  shared_with_id: string | null;
  title: string;
}

export interface ListRow {
  id: string;
  user_id: string;
  shared_with_id: string | null;
  name: string;
  elements: { text?: string | null }[];
}

export type RecipientDecision = { ok: true; recipientId: string } | { ok: false; reason: string };

export const PREFERENCE_BY_KIND: Record<SharedKind, string> = {
  task: "notif_shared_tasks",
  event: "notif_shared_events",
  list_item: "notif_shared_lists",
};

export const NOTIFICATION_TYPE_BY_KIND: Record<SharedKind, string> = {
  task: "shared_task",
  event: "shared_event",
  list_item: "shared_list_item",
};

export const PUSH_URL_BY_KIND: Record<SharedKind, string> = {
  task: "/tasks",
  event: "/calendar",
  list_item: "/notes/shopping",
};

const MAX_TEXT = 120;

function clip(value: string): string {
  const clean = value.replaceAll(/\s+/g, " ").trim();
  return clean.length > MAX_TEXT ? `${clean.slice(0, MAX_TEXT - 1)}…` : clean;
}

/** Ustala odbiorcę; zwraca powód odmowy, gdy nadawca nie ma prawa powiadomić kogoś o tym wierszu. */
export function resolveRecipient(
  kind: SharedKind,
  row: TaskRow | EventRow | ListRow,
  senderId: string,
  itemLabel?: string
): RecipientDecision {
  if (kind === "task") {
    const t = row as TaskRow;
    if (t.user_id !== senderId) return { ok: false, reason: "not_owner" };
    if (!t.for_user_id || t.for_user_id === senderId) return { ok: false, reason: "no_recipient" };
    return { ok: true, recipientId: t.for_user_id };
  }

  if (kind === "event") {
    const e = row as EventRow;
    if (e.user_id !== senderId) return { ok: false, reason: "not_owner" };
    if (!e.shared_with_id || e.shared_with_id === senderId) return { ok: false, reason: "no_recipient" };
    return { ok: true, recipientId: e.shared_with_id };
  }

  const l = row as ListRow;
  if (!l.shared_with_id) return { ok: false, reason: "not_shared" };
  let recipientId: string;
  if (l.user_id === senderId) recipientId = l.shared_with_id;
  else if (l.shared_with_id === senderId) recipientId = l.user_id;
  else return { ok: false, reason: "not_member" };
  if (recipientId === senderId) return { ok: false, reason: "no_recipient" };
  if (!itemLabel || !l.elements.some((el) => el?.text === itemLabel)) {
    return { ok: false, reason: "item_not_found" };
  }
  return { ok: true, recipientId };
}

export function notificationText(
  kind: SharedKind,
  row: TaskRow | EventRow | ListRow,
  itemLabel?: string
): { title: string; message: string } {
  if (kind === "task") {
    return { title: "Nowe zadanie dla Ciebie", message: clip((row as TaskRow).title || "Zadanie bez tytułu") };
  }
  if (kind === "event") {
    return {
      title: "Udostępniono Ci wydarzenie",
      message: clip((row as EventRow).title || "Wydarzenie bez tytułu"),
    };
  }
  const l = row as ListRow;
  return {
    title: "Nowa pozycja na wspólnej liście",
    message: clip(`Dodano „${itemLabel ?? ""}” do listy „${l.name || "Lista"}”`),
  };
}
