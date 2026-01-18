import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;

// Konfiguracja VAPID
if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:your-email@example.com', // Zmień na swój email
    vapidPublicKey,
    vapidPrivateKey
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Pobierz sesję z Supabase Auth
    const supabaseClient = createPagesServerClient({ req, res });
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    let userEmail: string | undefined;

    if (session?.user?.email) {
      userEmail = session.user.email;
    } else {
      // Fallback: użyj cookie auth
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user?.email) {
        userEmail = user.email;
      }
    }

    if (!userEmail) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Pobierz subskrypcje używając service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_email', userEmail);

    if (error || !subscriptions || subscriptions.length === 0) {
      return res.status(404).json({ error: 'No subscriptions found' });
    }

    // Przygotuj payload powiadomienia
    const payload = JSON.stringify({
      title: 'Dzisiaj - Test',
      body: 'Powiadomienia push działają poprawnie! 🎉',
      icon: '/icon.png',
      badge: '/icon.png',
      tag: 'test-notification',
      url: '/',
    });

    // Wyślij powiadomienie do wszystkich subskrypcji użytkownika
    const results = await Promise.allSettled(
      subscriptions.map(sub => 
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        )
      )
    );

    // Sprawdź czy jakieś powiadomienie się powiodło
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failedCount = results.filter(r => r.status === 'rejected').length;

    console.log(`Sent ${successCount} notifications, ${failedCount} failed`);

    res.status(200).json({ 
      message: 'Test notification sent',
      success: successCount,
      failed: failedCount,
      userEmail,
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ 
      error: 'Failed to send notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
