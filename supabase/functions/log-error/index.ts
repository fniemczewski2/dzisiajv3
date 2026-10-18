// supabase/functions/log-error/index.ts
//
// Zapis błędu aplikacji zgłoszonego przez zalogowanego użytkownika (tabela
// `errors`). Limit: LOG_LIMIT zgłoszeń na LOG_WINDOW_MINUTES minut na konto.
// Wpisy starsze niż 30 dni usuwa zadanie pg_cron (supabase/sql/…_retention.sql).

import { createClient } from "../_shared/supabase.ts";
import { json, preflight, unauthorized } from "../_shared/auth.ts";

const LOG_LIMIT = 20;
const LOG_WINDOW_MINUTES = 10;
const MAX_CONTEXT = 255;
const MAX_MESSAGE = 2000;
const MAX_STACK = 5000;

interface ErrorReport {
  context?: unknown;
  message?: unknown;
  stack?: unknown;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "Metoda niedozwolona." }, 405);

  let body: ErrorReport;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Nieprawidłowy format JSON." }, 400);
  }

  const context = typeof body.context === "string" ? body.context.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const stack = typeof body.stack === "string" ? body.stack : null;
  if (!context || !message) return json({ error: "Pola context i message są wymagane." }, 400);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return unauthorized();

  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(authHeader.slice("Bearer ".length));
  if (userError || !user) return unauthorized();

  const windowStart = new Date(Date.now() - LOG_WINDOW_MINUTES * 60_000).toISOString();
  const { count, error: countError } = await admin
    .from("errors")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", windowStart);
  if (countError) {
    console.error("[log-error] Nie udało się sprawdzić limitu:", countError.message);
    return json({ error: "Nie udało się zapisać zgłoszenia." }, 500);
  }
  if ((count ?? 0) >= LOG_LIMIT) {
    return new Response(JSON.stringify({ error: "Zbyt wiele zgłoszeń błędów. Spróbuj później." }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(LOG_WINDOW_MINUTES * 60) },
    });
  }

  const { error } = await admin.from("errors").insert({
    context: context.slice(0, MAX_CONTEXT),
    user_id: user.id,
    message: message.slice(0, MAX_MESSAGE),
    stack: stack ? stack.slice(0, MAX_STACK) : null,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[log-error] Zapis do bazy nie powiódł się:", error.message);
    return json({ error: "Nie udało się zapisać zgłoszenia." }, 500);
  }
  return json({ ok: true });
});
