// pages/api/notifications/send-reminders.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { NOTIFICATION_CONFIG } from '../../../config/notifications';
import { getAppDateTime, getAppDate } from '../../../lib/dateUtils';

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
  // Allow both GET and POST for cron-job.org compatibility
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret from header or query parameter
  const authHeader = req.headers.authorization;
  const querySecret = req.query.secret;
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret)) {
    console.error('Unauthorized access attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Use Poland timezone (Europe/Warsaw)
    const now = getAppDateTime();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    
    console.log(`[${new Date().toISOString()}] Running cron job at ${currentTime}`);
    
    let totalSent = 0;

    // Get all push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return res.status(500).json({ error: 'Failed to fetch subscriptions', details: subError.message });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found');
      return res.status(200).json({ 
        message: 'No subscriptions to process',
        sent: 0,
        time: currentTime
      });
    }

    // Group subscriptions by user
    const userSubscriptions: { [key: string]: any[] } = {};
    subscriptions.forEach(sub => {
      if (!userSubscriptions[sub.user_email]) {
        userSubscriptions[sub.user_email] = [];
      }
      userSubscriptions[sub.user_email].push({
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      });
    });

    console.log(`Processing notifications for ${Object.keys(userSubscriptions).length} users`);

    // Process each user using global config
    for (const userEmail of Object.keys(userSubscriptions)) {
      const userSubs = userSubscriptions[userEmail];
      
      // Check daily digest
      if (NOTIFICATION_CONFIG.tasks.enabled && 
          NOTIFICATION_CONFIG.tasks.dailyDigest && 
          NOTIFICATION_CONFIG.tasks.digestTime === currentTime) {
        console.log(`Sending daily digest to ${userEmail}`);
        const sent = await sendDailyDigest(userEmail, userSubs);
        totalSent += sent;
      }

      // Check habit reminder
      if (NOTIFICATION_CONFIG.habits.enabled && 
          NOTIFICATION_CONFIG.habits.reminderTime === currentTime) {
        console.log(`Sending habit reminder to ${userEmail}`);
        const sent = await sendHabitReminder(userEmail, userSubs);
        totalSent += sent;
      }

      // Check reminders (every 15 minutes)
      if (NOTIFICATION_CONFIG.reminders.enabled && currentMinute % 15 === 0) {
        const sent = await sendReminders(userEmail, userSubs);
        if (sent > 0) console.log(`Sent ${sent} reminders to ${userEmail}`);
        totalSent += sent;
      }

      // Check tasks (every 5 minutes)
      if (NOTIFICATION_CONFIG.tasks.enabled && currentMinute % 5 === 0) {
        const sent = await sendTaskReminders(userEmail, userSubs);
        if (sent > 0) console.log(`Sent ${sent} task reminders to ${userEmail}`);
        totalSent += sent;
      }

      // Check calendar events (every 5 minutes)
      if (NOTIFICATION_CONFIG.calendar.enabled && currentMinute % 5 === 0) {
        const sent = await sendCalendarReminders(userEmail, userSubs);
        if (sent > 0) console.log(`Sent ${sent} calendar reminders to ${userEmail}`);
        totalSent += sent;
      }
    }

    console.log(`[${new Date().toISOString()}] Cron job completed. Total sent: ${totalSent}`);

    res.status(200).json({ 
      success: true,
      message: 'Notifications processed',
      sent: totalSent,
      time: currentTime,
      users: Object.keys(userSubscriptions).length
    });
  } catch (error) {
    console.error('Error in send-reminders:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function sendDailyDigest(userEmail: string, subscriptions: any[]): Promise<number> {
  try {
    // Use Poland timezone for today's date
    const today = getAppDate();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('for_user', userEmail)
      .eq('status', 'todo')
      .gte('due_date', today)
      .lt('due_date', tomorrowStr);

    if (!tasks || tasks.length === 0) return 0;

    const payload = JSON.stringify({
      title: 'Dzisiaj - Twoje zadania',
      body: `Masz ${tasks.length} zadań na dziś`,
      icon: '/icon.png',
      url: '/tasks',
    });

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch (error) {
        console.error('Error sending to subscription:', error);
        // Remove invalid subscriptions
        if (error && typeof error === 'object' && 'statusCode' in error && (error.statusCode === 410 || error.statusCode === 404)) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
        }
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
    // Use Poland timezone for today's date
    const today = getAppDate();

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
      icon: '/icon.png',
      url: '/tasks',
    });

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch (error) {
        console.error('Error sending to subscription:', error);
        if (error && typeof error === 'object' && 'statusCode' in error && (error.statusCode === 410 || error.statusCode === 404)) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
        }
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
    // Use Poland timezone for today's date
    const today = getAppDate();

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
          icon: '/icon.png',
          url: '/tasks',
        });

        for (const sub of subscriptions) {
          try {
            await webpush.sendNotification(sub, payload);
            sent++;
          } catch (error) {
            console.error('Error sending to subscription:', error);
            if (error && typeof error === 'object' && 'statusCode' in error && (error.statusCode === 410 || error.statusCode === 404)) {
              await supabase
                .from('push_subscriptions')
                .delete()
                .eq('endpoint', sub.endpoint);
            }
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
    // Use Poland timezone for current time
    const now = getAppDateTime();
    
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('for_user', userEmail)
      .eq('status', 'todo')
      .not('due_date', 'is', null);

    if (!tasks) return 0;

    let sent = 0;
    const sentTaskIds = new Set<string>(); // Prevent duplicate notifications

    for (const task of tasks) {
      const dueDate = new Date(task.due_date);
      const timeDiff = dueDate.getTime() - now.getTime();
      const minutesDiff = Math.floor(timeDiff / (60 * 1000));

      // Only send if task hasn't been notified in this cycle
      if (sentTaskIds.has(task.id)) continue;

      for (const reminderMin of NOTIFICATION_CONFIG.tasks.reminderMinutes) {
        // Check if current time is within 5 minutes of reminder time
        if (Math.abs(minutesDiff - reminderMin) <= 5) {
          const payload = JSON.stringify({
            title: `Zadanie: ${task.title}`,
            body: `Za ${reminderMin} minut kończy się termin`,
            icon: '/icon.png',
            url: '/tasks',
          });

          for (const sub of subscriptions) {
            try {
              await webpush.sendNotification(sub, payload);
              sent++;
            } catch (error) {
              console.error('Error sending to subscription:', error);
              if (error && typeof error === 'object' && 'statusCode' in error && (error.statusCode === 410 || error.statusCode === 404)) {
                await supabase
                  .from('push_subscriptions')
                  .delete()
                  .eq('endpoint', sub.endpoint);
              }
            }
          }
          
          sentTaskIds.add(task.id);
          break; // Only send one reminder per task per check
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
    // Use Poland timezone for current time
    const now = getAppDateTime();
    const futureWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next 24 hours

    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('user_name', userEmail)
      .gte('start_time', now.toISOString())
      .lt('start_time', futureWindow.toISOString());

    if (!events) return 0;

    let sent = 0;
    const sentEventIds = new Set<string>(); // Prevent duplicate notifications

    for (const event of events) {
      const eventTime = new Date(event.start_time);
      const timeDiff = eventTime.getTime() - now.getTime();
      const minutesDiff = Math.floor(timeDiff / (60 * 1000));

      // Only send if event hasn't been notified in this cycle
      if (sentEventIds.has(event.id)) continue;

      for (const reminderMin of NOTIFICATION_CONFIG.calendar.reminderMinutes) {
        // Check if current time is within 5 minutes of reminder time
        if (Math.abs(minutesDiff - reminderMin) <= 5) {
          const payload = JSON.stringify({
            title: `Wydarzenie: ${event.title}`,
            body: `Za ${reminderMin} minut${event.place ? ` w ${event.place}` : ''}`,
            icon: '/icon.png',
            url: '/calendar',
          });

          for (const sub of subscriptions) {
            try {
              await webpush.sendNotification(sub, payload);
              sent++;
            } catch (error) {
              console.error('Error sending to subscription:', error);
              if (error && typeof error === 'object' && 'statusCode' in error && (error.statusCode === 410 || error.statusCode === 404)) {
                await supabase
                  .from('push_subscriptions')
                  .delete()
                  .eq('endpoint', sub.endpoint);
              }
            }
          }
          
          sentEventIds.add(event.id);
          break; // Only send one reminder per event per check
        }
      }
    }
    return sent;
  } catch (error) {
    console.error('Error in sendCalendarReminders:', error);
    return 0;
  }
}