// supabase/functions/send-love/index.ts
//
// Wysyła "serduszko" do pierwszej osoby z listy zaufanych (settings.users).
//
// Zabezpieczenia (wcześniej brakowało wszystkich trzech):
//   * wzajemność – odbiorca musi mieć nadawcę na SWOJEJ liście zaufanych;
//     sama lista nadawcy jest w pełni przez niego edytowalna, więc bez tego
//     dało się wysyłać powiadomienia push do dowolnego konta;
//   * limit – najwyżej LOVE_LIMIT serduszek na LOVE_WINDOW_MINUTES;
//   * brak enumeracji – odpowiedź nie zdradza, czy e-mail ma konto, i nie
//     zwraca UUID odbiorcy.
// Wyszukanie użytkownika idzie przez RPC find_user_id_by_email (indeksowane
// zapytanie) zamiast stronicowania auth.admin.listUsers po 20 tys. kont.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const LOVE_LIMIT = 5;
const LOVE_WINDOW_MINUTES = 10;

// Ta sama odpowiedź dla "brak konta" i "brak wzajemności" – inaczej funkcja
// znów stałaby się wyrocznią "czy ten e-mail ma konto".
const NOT_DELIVERABLE = {
  success: false,
  message: "Nie można wysłać serduszka. Upewnij się, że ta osoba też ma Cię na liście zaufanych.",
};

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function normalizeEmails(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((e): e is string => typeof e === "string")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

type Client = ReturnType<typeof createClient>;

async function readTrustedEmails(admin: Client, userId: string): Promise<string[]> {
  const { data, error } = await admin.from("settings").select("users").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return normalizeEmails(data?.users);
}

/** Limit liczony z istniejących powiadomień – działa niezależnie od liczby instancji funkcji. */
async function isRateLimited(admin: Client, userId: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - LOVE_WINDOW_MINUTES * 60_000).toISOString();
  const { count, error } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("type", "love_message")
    .eq("data->>sender_id", userId)
    .gte("created_at", windowStart);
  if (error) throw error;
  return (count ?? 0) >= LOVE_LIMIT;
}

type RecipientResult = { ok: true; userId: string } | { ok: false; body: Record<string, unknown> };

/** Pierwsza osoba z listy zaufanych nadawcy – tylko jeśli ona też ufa nadawcy (wzajemność). */
async function resolveRecipient(admin: Client, asSender: Client, senderId: string, senderEmail: string): Promise<RecipientResult> {
  const recipientEmail = (await readTrustedEmails(admin, senderId))[0];
  if (!recipientEmail) return { ok: false, body: { success: false, message: "Brak odbiorców" } };
  if (recipientEmail === senderEmail) return { ok: false, body: NOT_DELIVERABLE };

  const { data: targetUserId, error } = await asSender.rpc("find_user_id_by_email", { p_email: recipientEmail });
  if (error) throw error;
  if (!targetUserId) return { ok: false, body: NOT_DELIVERABLE };

  const trustedByRecipient = await readTrustedEmails(admin, targetUserId as string);
  if (!trustedByRecipient.includes(senderEmail)) return { ok: false, body: NOT_DELIVERABLE };
  return { ok: true, userId: targetUserId as string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return respond({ error: "Metoda niedozwolona." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return respond({ error: "Brak autoryzacji." }, 401);
  const jwt = authHeader.slice("Bearer ".length);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  try {
    const { data: { user }, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !user?.email) return respond({ error: "Brak autoryzacji." }, 401);
    const senderEmail = user.email.toLowerCase();

    if (await isRateLimited(admin, user.id)) {
      return respond({ success: false, message: "Za dużo serduszek naraz – spróbuj za kilka minut." }, 429);
    }

    // RPC z JWT nadawcy: find_user_id_by_email jest nadane rolom
    // `authenticated`, nie `anon`/`public`.
    const asSender = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const recipient = await resolveRecipient(admin, asSender, user.id, senderEmail);
    if (!recipient.ok) return respond(recipient.body);
    const targetUserId = recipient.userId;

    const title = "Kocham Cię!";
    const message = "Ktoś przesyła Ci dużo miłości!";

    const { error: insertError } = await admin.from("notifications").insert({
      user_id: targetUserId,
      type: "love_message",
      title,
      message,
      data: { sender_id: user.id },
    });
    if (insertError) throw insertError;

    const pushRes = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: targetUserId,
        title,
        message,
        url: "/",
        data: { type: "love_message", from: user.id },
      }),
    });
    if (!pushRes.ok) {
      console.error("[send-love] send-push failed:", await pushRes.text());
    }

    await admin
      .channel(`love_channel_${targetUserId}`)
      .send({
        type: "broadcast",
        event: "love_received",
        payload: { message: "Ktoś przesłał Ci serduszko!" },
      });

    return respond({ success: true, message: "Wysłano serduszko" });
  } catch (error) {
    console.error("[send-love]:", error instanceof Error ? error.message : error);
    return respond({ error: "Nie udało się wysłać serduszka." }, 500);
  }
});
