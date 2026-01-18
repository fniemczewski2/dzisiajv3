import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;

// Używamy service role client bo to cron job bez sesji użytkownika
const supabase = createClient(supabaseUrl, supabaseServiceKey);

webpush.setVapidDetails(
  'mailto:your-email@example.com', // Zmień na swój email
  vapidPublicKey,
  vapidPrivateKey
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Opcjonalnie: zabezpiecz endpoint przed nieautoryzowanym dostępem
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Pobierz wszystkie aktywne przypomnienia
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // To jest uproszczona wersja - dostosuj do struktury twojej tabeli reminders
    const { data: reminders, error: remindersError } = await supabase
      .from('reminders')
      .select('*')
      .is('done', null); // Tylko aktywne przypomnienia

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
      return res.status(500).json({ error: 'Failed to fetch reminders' });
    }

    if (!reminders || reminders.length === 0) {
      return res.status(200).json({ message: 'No reminders to process' });
    }

    let sentCount = 0;
    let errorCount = 0;

    // Przetwarzaj każde przypomnienie
    for (const reminder of reminders) {
      // Sprawdź czy przypomnienie powinno być wysłane teraz
      // To wymaga dostosowania do twojej logiki powtarzania
      const reminderTime = new Date(reminder.data_poczatkowa);
      const reminderTimeStr = `${String(reminderTime.getHours()).padStart(2, '0')}:${String(reminderTime.getMinutes()).padStart(2, '0')}`;

      if (reminderTimeStr !== currentTime) {
        continue; // Pomiń jeśli nie jest teraz
      }

      // Pobierz subskrypcje użytkownika
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_email', reminder.user_email);

      if (subError || !subscriptions || subscriptions.length === 0) {
        console.log(`No subscriptions for user: ${reminder.user_email}`);
        continue;
      }

      // Przygotuj payload
      const payload = JSON.stringify({
        title: 'Dzisiaj - Przypomnienie',
        body: reminder.tytul,
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        tag: `reminder-${reminder.id}`,
        url: '/tasks',
      });

      // Wyślij do wszystkich subskrypcji użytkownika
      try {
        await Promise.allSettled(
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
        sentCount++;
      } catch (error) {
        console.error(`Error sending notification for reminder ${reminder.id}:`, error);
        errorCount++;
      }
    }

    res.status(200).json({
      message: 'Reminder notifications processed',
      sent: sentCount,
      errors: errorCount,
    });
  } catch (error) {
    console.error('Error in send-reminders handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
