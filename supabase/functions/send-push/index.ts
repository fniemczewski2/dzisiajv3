// supabase/functions/send-push/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import webpush from 'npm:web-push@3.6.6'
import { safeEqual, corsHeaders, jsonHeaders, unauthorized } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const bearer = authHeader.replace(/^Bearer\s+/i, '');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey
    )

    const { userId: requestedUserId, title, message, url, data } = await req.json()

    let userId: string;

    if (bearer && serviceRoleKey && safeEqual(bearer, serviceRoleKey)) {
      // Wywołanie wewnętrzne (cron, send-love): adresata wskazuje treść żądania.
      if (!requestedUserId) {
        return new Response(JSON.stringify({ error: "Brak parametru userId w żądaniu." }), { status: 400, headers: jsonHeaders })
      }
      userId = requestedUserId;
    } else {
      // Zalogowany użytkownik (np. przycisk testu) wysyła wyłącznie do siebie –
      // userId bierzemy z tokenu. Wcześniej brak userId w treści kończył się
      // błędem, więc test powiadomień nigdy nie działał.
      const { data: { user }, error: userError } = await supabase.auth.getUser(bearer);
      if (userError || !user) {
        return unauthorized();
      }
      userId = user.id;
    }

    // Konfigurację sprawdzamy jawnie: brak lub zły klucz VAPID to najczęstsza
    // przyczyna niedziałających powiadomień, a ogólny błąd 400 jej nie zdradzał.
    const vapidEmail = Deno.env.get('VAPID_EMAIL')
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
    if (!vapidEmail || !vapidPublic || !vapidPrivate) {
      console.error('send-push: brak sekretów VAPID_EMAIL / VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY')
      return new Response(
        JSON.stringify({ error: 'Serwer nie ma skonfigurowanych kluczy VAPID.', code: 'vapid_missing' }),
        { status: 500, headers: jsonHeaders }
      )
    }
    try {
      webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate)
    } catch (vapidError) {
      console.error('send-push: nieprawidłowe klucze VAPID:', vapidError instanceof Error ? vapidError.message : vapidError)
      return new Response(
        JSON.stringify({ error: 'Klucze VAPID na serwerze są nieprawidłowe.', code: 'vapid_invalid' }),
        { status: 500, headers: jsonHeaders }
      )
    }

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', userId)

    if (error) throw error

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`Brak subskrypcji push dla użytkownika: ${userId}`);
      return new Response(
        JSON.stringify({ success: true, sent: 0, total: 0, message: 'Brak subskrypcji powiadomień dla tego użytkownika.' }),
        { headers: jsonHeaders }
      )
    }

    const payload = JSON.stringify({
      title,
      message,
      url: url || '/',
      data: data || {},
      id: crypto.randomUUID()
    })

    const sendPromises = subscriptions.map(async (sub: { id: string; subscription: webpush.PushSubscription }) => {
      try {
        await webpush.sendNotification(sub.subscription, payload, { TTL: 60 * 60 * 12, urgency: 'high' })
        return { success: true }
      } catch (error) {
        console.error('Błąd wysyłki push (WebPush):', error)
        const statusCode = (error as { statusCode?: number }).statusCode

        // 404/410: subskrypcja wygasła lub została cofnięta w przeglądarce.
        if (statusCode === 410 || statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id)
        }

        return { success: false, statusCode }
      }
    })

    const results: { success: boolean; statusCode?: number }[] = await Promise.all(sendPromises)
    const successCount = results.filter(r => r.success).length
    // Same kody HTTP (bez treści błędów) – pozwalają przyciskowi testu wskazać przyczynę.
    const failedStatusCodes = results
      .map((r) => r.statusCode)
      .filter((c): c is number => typeof c === 'number')

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: subscriptions.length,
        failedStatusCodes,
      }),
      { headers: jsonHeaders }
    )
  } catch (error) {
    console.error("Critical error in send-push:", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: "Nie udało się wysłać powiadomienia." }),
      { status: 400, headers: jsonHeaders }
    )
  }
})
