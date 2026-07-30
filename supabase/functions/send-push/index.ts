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
    if (!requestedUserId) {
      throw new Error("Brak parametru userId w żądaniu");
    }

    let userId: string;

    if (bearer && serviceRoleKey && safeEqual(bearer, serviceRoleKey)) {
      userId = requestedUserId;
    } else {
      const { data: { user }, error: userError } = await supabase.auth.getUser(bearer);
      if (userError || !user) {
        return unauthorized();
      }
      userId = user.id;
    }

    webpush.setVapidDetails(
      Deno.env.get('VAPID_EMAIL')!,
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!
    )

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', userId)

    if (error) throw error

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`Brak subskrypcji push dla użytkownika: ${userId}`);
      return new Response(
        JSON.stringify({ message: 'No subscriptions found for this UUID' }),
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

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payload)
        return { success: true }
      } catch (error) {
        console.error('Błąd wysyłki push (WebPush):', error)

        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id)
        }

        return { success: false, error: error.message }
      }
    })

    const results = await Promise.all(sendPromises)
    const successCount = results.filter(r => r.success).length

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: subscriptions.length
      }),
      { headers: jsonHeaders }
    )
  } catch (error) {
    console.error("Critical error in send-push:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: jsonHeaders }
    )
  }
})
