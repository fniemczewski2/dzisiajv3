// pages/api/notifications/send-scheduled.ts
// Simplified version - uses static config from config/notifications.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { NOTIFICATION_CONFIG } from '../../../config/notifications';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:your-email@example.com',
    vapidPublicKey,
    vapidPrivateKey
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    
    let totalSent = 0;

    // Get all push subscriptions (no user-specific settings, config is global)
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }

    // Group subscriptions by user
    const userSubscriptions: { [key: string]: any[] } = {};
    subscriptions?.forEach(sub => {
      if (!userSubscriptions[sub.user_email]) {
        userSubscriptions[sub.user_email] = [];
      }
      userSubscriptions[sub.user_email].push(sub);
    });

    // Process each user using global config
    for (const userEmail of Object.keys(userSubscriptions)) {
      const userSubs = userSubscriptions[userEmail];
      // Check daily digest
      if (NOTIFICATION_CONFIG.tasks.enabled && 
          NOTIFICATION_CONFIG.tasks.dailyDigest && 
          NOTIFICATION_CONFIG.tasks.digestTime === currentTime) {
        const sent = await sendDailyDigest(userEmail, userSubs);
        totalSent += sent;
      }

      // Check habit reminder
      if (NOTIFICATION_CONFIG.habits.enabled && 
          NOTIFICATION_CONFIG.habits.reminderTime === currentTime) {
        const sent = await sendHabitReminder(userEmail, userSubs);
        totalSent += sent;
      }

      // Check reminders (every hour at :00)
      if (NOTIFICATION_CONFIG.reminders.enabled && currentMinute === 0) {
        const sent = await sendReminders(userEmail, userSubs);
        totalSent += sent;
      }

      // Check tasks (every 15 minutes)
      if (NOTIFICATION_CONFIG.tasks.enabled && currentMinute % 15 === 0) {
        const sent = await sendTaskReminders(userEmail, userSubs);
        totalSent += sent;
      }

      // Check calendar events (every 15 minutes)
      if (NOTIFICATION_CONFIG.calendar.enabled && currentMinute % 15 === 0) {
        const sent = await sendCalendarReminders(userEmail, userSubs);
        totalSent += sent;
      }
    }

    res.status(200).json({ 
      message: 'Notifications sent',
      sent: totalSent,
      time: currentTime
    });
  } catch (error) {
    console.error('Error in send-scheduled:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function sendDailyDigest(userEmail: string, subscriptions: any[]): Promise<number> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('for_user', userEmail)
      .eq('status', 'todo')
      .gte('due_date', today.toISOString().split('T')[0])
      .lt('due_date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (!tasks || tasks.length === 0) return 0;

    const payload = JSON.stringify({
      title: 'Dzisiaj - Twoje zadania',
      body: `Masz ${tasks.length} zadań na dziś`,
      icon: '/icon-192x192.png',
      url: '/tasks',
    });

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch (error) {
        console.error('Error sending to subscription:', error);
      }
    }
    return sent;
  } catch (error) {
    console.error('Error in sendDailyDigest:', error);
    return 0;
  }
}

async function sendHabitReminder(userEmail: string, subscriptions: any[]): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: habits } = await supabase
      .from('daily_habits')
      .select('*')
      .eq('user_name', userEmail)
      .eq('date', today)
      .single();

    if (!habits) return 0;

    const undoneHabits = Object.entries(habits)
      .filter(([key, value]) => {
        if (key === 'date' || key === 'user_name' || key === 'water_amount' || key === 'daily_spending') {
          return false;
        }
        return value === false;
      });

    if (undoneHabits.length === 0) return 0;

    const payload = JSON.stringify({
      title: 'Dzisiaj - Nawyki',
      body: `Pamiętaj o ${undoneHabits.length} nawykach`,
      icon: '/icon-192x192.png',
      url: '/tasks',
    });

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch (error) {
        console.error('Error sending to subscription:', error);
      }
    }
    return sent;
  } catch (error) {
    console.error('Error in sendHabitReminder:', error);
    return 0;
  }
}

async function sendReminders(userEmail: string, subscriptions: any[]): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: reminders } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_email', userEmail);

    if (!reminders) return 0;

    let sent = 0;
    for (const reminder of reminders) {
      const startDate = new Date(reminder.data_poczatkowa);
      let nextOccurrence = new Date(startDate);

      if (reminder.done) {
        const lastDone = new Date(reminder.done);
        nextOccurrence = new Date(lastDone.getTime() + reminder.powtarzanie * 24 * 60 * 60 * 1000);
      }

      const nextOccurrenceStr = nextOccurrence.toISOString().split('T')[0];

      if (nextOccurrenceStr === today) {
        const payload = JSON.stringify({
          title: `Przypomnienie: ${reminder.tytul}`,
          body: `Powtarza się co ${reminder.powtarzanie} dni`,
          icon: '/icon-192x192.png',
          url: '/tasks',
        });

        for (const sub of subscriptions) {
          try {
            await webpush.sendNotification(sub, payload);
            sent++;
          } catch (error) {
            console.error('Error sending to subscription:', error);
          }
        }
      }
    }
    return sent;
  } catch (error) {
    console.error('Error in sendReminders:', error);
    return 0;
  }
}

async function sendTaskReminders(userEmail: string, subscriptions: any[]): Promise<number> {
  try {
    const now = new Date();
    
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('for_user', userEmail)
      .eq('status', 'todo')
      .not('due_date', 'is', null);

    if (!tasks) return 0;

    let sent = 0;
    for (const task of tasks) {
      const dueDate = new Date(task.due_date);
      const timeDiff = dueDate.getTime() - now.getTime();
      const minutesDiff = Math.floor(timeDiff / (60 * 1000));

      for (const reminderMin of NOTIFICATION_CONFIG.tasks.reminderMinutes) {
        if (Math.abs(minutesDiff - reminderMin) < 5) {
          const payload = JSON.stringify({
            title: `Zadanie: ${task.title}`,
            body: `Za ${reminderMin} minut kończy się termin`,
            icon: '/icon-192x192.png',
            url: '/tasks',
          });

          for (const sub of subscriptions) {
            try {
              await webpush.sendNotification(sub, payload);
              sent++;
            } catch (error) {
              console.error('Error sending to subscription:', error);
            }
          }
        }
      }
    }
    return sent;
  } catch (error) {
    console.error('Error in sendTaskReminders:', error);
    return 0;
  }
}

async function sendCalendarReminders(userEmail: string, subscriptions: any[]): Promise<number> {
  try {
    const now = new Date();

    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('user_name', userEmail)
      .gte('start_time', now.toISOString())
      .lt('start_time', new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString());

    if (!events) return 0;

    let sent = 0;
    for (const event of events) {
      const eventTime = new Date(event.start_time);
      const timeDiff = eventTime.getTime() - now.getTime();
      const minutesDiff = Math.floor(timeDiff / (60 * 1000));

      for (const reminderMin of NOTIFICATION_CONFIG.calendar.reminderMinutes) {
        if (Math.abs(minutesDiff - reminderMin) < 5) {
          const payload = JSON.stringify({
            title: `Wydarzenie: ${event.title}`,
            body: `Za ${reminderMin} minut${event.place ? ` w ${event.place}` : ''}`,
            icon: '/icon-192x192.png',
            url: '/calendar',
          });

          for (const sub of subscriptions) {
            try {
              await webpush.sendNotification(sub, payload);
              sent++;
            } catch (error) {
              console.error('Error sending to subscription:', error);
            }
          }
        }
      }
    }
    return sent;
  } catch (error) {
    console.error('Error in sendCalendarReminders:', error);
    return 0;
  }
}