// supabase/functions/_shared/sharedNotifyRules.ts
//
// Czyste reguły powiadomień o współdzieleniu (bez zależności Deno, testowalne w Vitest).
// Decydują, kto jest odbiorcą i jaki tekst dostanie, na podstawie wiersza z bazy – nie na podstawie
// danych przysłanych przez klienta.

import { MAX_SHARED_NOTIFY_TEXT } from "./config.ts";

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

function clip(value: string): string {
  const clean = value.replaceAll(/\s+/g, " ").trim();
  return clean.length > MAX_SHARED_NOTIFY_TEXT ? `${clean.slice(0, MAX_SHARED_NOTIFY_TEXT - 1)}…` : clean;
}

/** Zmiana na liście zgłoszona przez klienta: etykiety dodanych i usuniętych pozycji (do weryfikacji po stronie serwera). */
export interface ListChangeRequest {
  added: string[];
  removed: string[];
}

/** Zmiana potwierdzona danymi z bazy: liczby pozycji i – gdy zmieniono dokładnie jedną – jej etykieta. */
export interface ListChangeSummary {
  added: number;
  removed: number;
  label?: string;
}

/** Ustala odbiorcę; zwraca powód odmowy, gdy nadawca nie ma prawa powiadomić kogoś o tym wierszu. */
export function resolveRecipient(
  kind: SharedKind,
  row: TaskRow | EventRow | ListRow,
  senderId: string
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
  return { ok: true, recipientId };
}

/**
 * Liczby zmian potwierdzone stanem listy w bazie, nie deklaracją klienta: dodana pozycja musi być na liście,
 * usunięta nie może na niej być. Pozycje bez pokrycia są pomijane, więc klient nie wyprodukuje fałszywych liczb
 * (a pozycja usunięta w międzyczasie przez drugą osobę nie zawyża powiadomienia).
 */
export function summarizeListChange(row: ListRow, request: ListChangeRequest): ListChangeSummary {
  const present = new Set(row.elements.map((el) => el?.text).filter((t): t is string => typeof t === "string"));
  const added = request.added.filter((label) => present.has(label));
  const removed = request.removed.filter((label) => !present.has(label));
  const total = added.length + removed.length;
  const single = total === 1 ? (added[0] ?? removed[0]) : undefined;
  return { added: added.length, removed: removed.length, ...(single ? { label: single } : {}) };
}

/** „pozycję” (1), „pozycje” (2–4, poza 12–14), „pozycji” (pozostałe). */
export function pozycjaForm(n: number): string {
  if (n === 1) return "pozycję";
  const lastTwo = n % 100;
  const last = n % 10;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? "pozycje" : "pozycji";
}

/** Tytuł i treść powiadomienia o zmianie listy: jedna pozycja z nazwą, kilka – zbiorczo z liczbami. */
export function listChangeText(listName: string, change: ListChangeSummary): { title: string; message: string } {
  const list = `„${listName || "Lista"}”`;
  const { added, removed, label } = change;
  if (added > 0 && removed === 0) {
    return {
      title: added === 1 ? "Nowa pozycja na wspólnej liście" : "Nowe pozycje na wspólnej liście",
      message: clip(
        label ? `Dodano „${label}” do listy ${list}` : `Dodano ${added} ${pozycjaForm(added)} do listy ${list}`
      ),
    };
  }
  if (removed > 0 && added === 0) {
    return {
      title: "Zmiany na wspólnej liście",
      message: clip(
        label ? `Usunięto „${label}” z listy ${list}` : `Usunięto ${removed} ${pozycjaForm(removed)} z listy ${list}`
      ),
    };
  }
  return {
    title: "Zmiany na wspólnej liście",
    message: clip(`Dodano ${added} i usunięto ${removed} ${pozycjaForm(removed)} na liście ${list}`),
  };
}

export function notificationText(
  kind: SharedKind,
  row: TaskRow | EventRow | ListRow,
  change?: ListChangeSummary
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
  return listChangeText((row as ListRow).name, change ?? { added: 1, removed: 0 });
}
