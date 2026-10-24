// supabase/functions/notify-shared/index.ts
//
// Powiadomienia o współdzieleniu: nowa pozycja na wspólnej liście, zadanie lub wydarzenie
// przydzielone innej osobie. Klient wysyła tylko wskazanie rekordu; reguły (kto jest odbiorcą,
// czy pozycja istnieje, czy odbiorca wyłączył ten rodzaj powiadomień) sprawdza serwer w bazie.

import { createClient } from "../_shared/supabase.ts";
import { json, preflight, withCors } from "../_shared/auth.ts";
import {
  NOTIFICATION_TYPE_BY_KIND,
  PREFERENCE_BY_KIND,
  PUSH_URL_BY_KIND,
  notificationText,
  resolveRecipient,
  type EventRow,
  type ListRow,
  type SharedKind,
  type TaskRow,
} from "../_shared/sharedNotifyRules.ts";

const RATE_LIMIT = 30;
const RATE_WINDOW_MINUTES = 10;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TABLE_BY_KIND: Record<SharedKind, string> = { task: "tasks", event: "events", list_item: "shopping_lists" };
const SELECT_BY_KIND: Record<SharedKind, string> = {
  task: "id, user_id, for_user_id, title",
  event: "id, user_id, shared_with_id, title",
  list_item: "id, user_id, shared_with_id, name, elements",
};

type Body = { kind: SharedKind; id: string; label?: string };

function parseBody(raw: unknown): Body | null {
  if (!raw || typeof raw !== "object") return null;
  const { kind, id, label } = raw as Record<string, unknown>;
  if (kind !== "task" && kind !== "event" && kind !== "list_item") return null;
  if (typeof id !== "string" || !UUID_RE.test(id)) return null;
  if (kind === "list_item") {
    if (typeof label !== "string" || label.trim().length === 0 || label.length > 200) return null;
    return { kind, id, label: label.trim() };
  }
  return { kind, id };
}

Deno.serve(
  withCors(async (req) => {
    if (req.method === "OPTIONS") return preflight();
    if (req.method !== "POST") return json({ error: "Metoda niedozwolona." }, 405);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Brak autoryzacji." }, 401);
    const jwt = authHeader.slice("Bearer ".length);

    const body = parseBody(await req.json().catch(() => null));
    if (!body) return json({ error: "Nieprawidłowe dane." }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    try {
      const {
        data: { user },
        error: userError,
      } = await admin.auth.getUser(jwt);
      if (userError || !user) return json({ error: "Brak autoryzacji." }, 401);
      const senderId = user.id;

      const windowStart = new Date(Date.now() - RATE_WINDOW_MINUTES * 60_000).toISOString();
      const { count, error: countError } = await admin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("data->>sender_id", senderId)
        .like("type", "shared_%")
        .gte("created_at", windowStart);
      if (countError) throw countError;
      if ((count ?? 0) >= RATE_LIMIT) {
        return json({ success: false, message: "Za dużo powiadomień naraz – spróbuj za kilka minut." }, 429);
      }

      const { data: row, error: rowError } = await admin
        .from(TABLE_BY_KIND[body.kind])
        .select(SELECT_BY_KIND[body.kind])
        .eq("id", body.id)
        .maybeSingle();
      if (rowError) throw rowError;
      // Ten sam komunikat dla „brak rekordu” i „brak prawa” – nie ujawniamy cudzych identyfikatorów.
      const denied = json({ success: false, message: "Nie można wysłać powiadomienia." }, 403);
      if (!row) return denied;

      const rowData = row as unknown as TaskRow | EventRow | ListRow;
      const decision = resolveRecipient(body.kind, rowData, senderId, body.label);
      if (!decision.ok) return denied;
      const recipientId = decision.recipientId;

      const prefColumn = PREFERENCE_BY_KIND[body.kind];
      const { data: prefs, error: prefsError } = await admin
        .from("settings")
        .select(prefColumn)
        .eq("user_id", recipientId)
        .maybeSingle();
      if (prefsError) throw prefsError;
      // Odbiorca wyłączył ten rodzaj: nic nie zapisujemy ani nie wysyłamy; nadawca dostaje zwykłą odpowiedź.
      if ((prefs as Record<string, unknown> | null)?.[prefColumn] === false) {
        return json({ success: true, sent: false });
      }

      const { title, message } = notificationText(body.kind, rowData, body.label);
      const type = NOTIFICATION_TYPE_BY_KIND[body.kind];
      const { error: insertError } = await admin.from("notifications").insert({
        user_id: recipientId,
        type,
        title,
        message,
        data: { sender_id: senderId, kind: body.kind, id: body.id },
      });
      if (insertError) throw insertError;

      const pushRes = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: "POST",
        headers: { Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: recipientId,
          title,
          message,
          url: PUSH_URL_BY_KIND[body.kind],
          data: { type, from: senderId },
        }),
      });
      if (!pushRes.ok) console.error("[notify-shared] send-push failed:", await pushRes.text());

      return json({ success: true, sent: true });
    } catch (err) {
      console.error("[notify-shared] błąd:", err);
      return json({ error: "Nie udało się wysłać powiadomienia." }, 500);
    }
  })
);
