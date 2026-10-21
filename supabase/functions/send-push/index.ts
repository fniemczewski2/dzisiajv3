// supabase/functions/send-push/index.ts

import { createClient, type SupabaseClient } from "../_shared/supabase.ts";
import webpush from "npm:web-push@3.6.6";
import { safeEqual, jsonHeaders, preflight, unauthorized, withCors } from "../_shared/auth.ts";

interface PushRequest {
  userId?: string;
  title?: string;
  message?: string;
  url?: string;
  data?: Record<string, unknown>;
}

interface StoredSubscription {
  id: string;
  subscription: webpush.PushSubscription;
}

interface SendResult {
  success: boolean;
  statusCode?: number;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: jsonHeaders });

/**
 * Adresat powiadomienia. Wywołanie wewnętrzne (cron, send-love) z kluczem
 * service_role wskazuje go w treści; zalogowany użytkownik (przycisk testu)
 * wysyła wyłącznie do siebie – userId bierzemy z tokenu.
 */
async function resolveUserId(
  supabase: SupabaseClient,
  bearer: string,
  serviceRoleKey: string,
  requestedUserId: string | undefined
): Promise<string | Response> {
  if (bearer && serviceRoleKey && safeEqual(bearer, serviceRoleKey)) {
    return requestedUserId ?? json({ error: "Brak parametru userId w żądaniu." }, 400);
  }
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(bearer);
  return error || !user ? unauthorized() : user.id;
}

/**
 * Konfigurację VAPID sprawdzamy jawnie: brak lub zły klucz to najczęstsza
 * przyczyna niedziałających powiadomień, a ogólny błąd 400 jej nie zdradzał.
 */
function configureVapid(): Response | null {
  const vapidEmail = Deno.env.get("VAPID_EMAIL");
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!vapidEmail || !vapidPublic || !vapidPrivate) {
    console.error("send-push: brak sekretów VAPID_EMAIL / VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY");
    return json({ error: "Serwer nie ma skonfigurowanych kluczy VAPID.", code: "vapid_missing" }, 500);
  }
  try {
    webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);
    return null;
  } catch (vapidError) {
    console.error(
      "send-push: nieprawidłowe klucze VAPID:",
      vapidError instanceof Error ? vapidError.message : vapidError
    );
    return json({ error: "Klucze VAPID na serwerze są nieprawidłowe.", code: "vapid_invalid" }, 500);
  }
}

async function sendToSubscription(
  supabase: SupabaseClient,
  sub: StoredSubscription,
  payload: string
): Promise<SendResult> {
  try {
    await webpush.sendNotification(sub.subscription, payload, { TTL: 60 * 60 * 12, urgency: "high" });
    return { success: true };
  } catch (error) {
    console.error("Błąd wysyłki push (WebPush):", error);
    const statusCode = (error as { statusCode?: number }).statusCode;
    // 404/410: subskrypcja wygasła lub została cofnięta w przeglądarce.
    if (statusCode === 410 || statusCode === 404) {
      await supabase.from("push_subscriptions").delete().eq("id", sub.id);
    }
    return { success: false, statusCode };
  }
}

Deno.serve(
  withCors(async (req) => {
    if (req.method === "OPTIONS") {
      return preflight();
    }

    try {
      const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceRoleKey);

      const { userId: requestedUserId, title, message, url, data } = (await req.json()) as PushRequest;

      const userId = await resolveUserId(supabase, bearer, serviceRoleKey, requestedUserId);
      if (userId instanceof Response) return userId;

      const vapidProblem = configureVapid();
      if (vapidProblem) return vapidProblem;

      const { data: subscriptions, error } = await supabase
        .from("push_subscriptions")
        .select("id, subscription")
        .eq("user_id", userId);
      if (error) throw error;

      if (!subscriptions || subscriptions.length === 0) {
        console.log(`Brak subskrypcji push dla użytkownika: ${userId}`);
        return json({
          success: true,
          sent: 0,
          total: 0,
          message: "Brak subskrypcji powiadomień dla tego użytkownika.",
        });
      }

      const payload = JSON.stringify({ title, message, url: url || "/", data: data || {}, id: crypto.randomUUID() });
      const results = await Promise.all(
        (subscriptions as StoredSubscription[]).map((sub) => sendToSubscription(supabase, sub, payload))
      );

      // Same kody HTTP (bez treści błędów) – pozwalają przyciskowi testu wskazać przyczynę.
      const failedStatusCodes = results.map((r) => r.statusCode).filter((c): c is number => typeof c === "number");

      return json({
        success: true,
        sent: results.filter((r) => r.success).length,
        total: subscriptions.length,
        failedStatusCodes,
      });
    } catch (error) {
      console.error("Critical error in send-push:", error instanceof Error ? error.message : error);
      return json({ error: "Nie udało się wysłać powiadomienia." }, 400);
    }
  })
);
