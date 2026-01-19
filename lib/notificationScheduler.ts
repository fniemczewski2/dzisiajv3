// lib/notificationScheduler.ts
import { Task, Reminder, Event, DailyHabits } from '../types';
import { NotificationConfig, NOTIFICATION_CONFIG } from '../config/notifications';

export type { NotificationConfig };

export interface ScheduledNotification {
  id: string;
  type: 'task' | 'reminder' | 'habit' | 'calendar' | 'digest';
  title: string;
  body: string;
  scheduledTime: Date;
  data?: any;
  url?: string;
}

export class NotificationScheduler {
  private config: NotificationConfig;

  constructor(config: NotificationConfig = NOTIFICATION_CONFIG) {
    this.config = config;
  }

  // Schedule notifications for tasks
  scheduleTaskNotifications(tasks: Task[]): ScheduledNotification[] {
    if (!this.config.tasks.enabled) return [];

    const notifications: ScheduledNotification[] = [];
    const now = new Date();

    tasks.forEach(task => {
      if (task.status === 'done' || !task.due_date) return;

      const dueDate = new Date(task.due_date);
      
      // Schedule reminders before due date
      this.config.tasks.reminderMinutes.forEach(minutes => {
        const notificationTime = new Date(dueDate.getTime() - minutes * 60 * 1000);
        
        if (notificationTime > now) {
          notifications.push({
            id: `task-${task.id}-${minutes}`,
            type: 'task',
            title: `Zadanie: ${task.title}`,
            body: `Za ${minutes} minut kończy się termin`,
            scheduledTime: notificationTime,
            data: { taskId: task.id },
            url: '/tasks',
          });
        }
      });

      // Notification on due date
      if (dueDate > now) {
        const dueDateNotification = new Date(dueDate);
        dueDateNotification.setHours(9, 0, 0, 0); // 9 AM on due date
        
        if (dueDateNotification > now) {
          notifications.push({
            id: `task-${task.id}-due`,
            type: 'task',
            title: `Termin dzisiaj: ${task.title}`,
            body: task.description || 'Pamiętaj o wykonaniu tego zadania',
            scheduledTime: dueDateNotification,
            data: { taskId: task.id },
            url: '/tasks',
          });
        }
      }
    });

    return notifications;
  }

  // Schedule daily task digest
  scheduleDailyDigest(tasks: Task[]): ScheduledNotification | null {
    if (!this.config.tasks.enabled || !this.config.tasks.dailyDigest) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayTasks = tasks.filter(task => {
      if (task.status === 'done' || !task.due_date) return false;
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    });

    if (todayTasks.length === 0) return null;

    const [hours, minutes] = this.config.tasks.digestTime.split(':').map(Number);
    const digestTime = new Date();
    digestTime.setHours(hours, minutes, 0, 0);

    if (digestTime < new Date()) {
      digestTime.setDate(digestTime.getDate() + 1);
    }

    return {
      id: 'task-digest',
      type: 'digest',
      title: 'Dzisiaj - Twoje zadania',
      body: `Masz ${todayTasks.length} zadań na dziś`,
      scheduledTime: digestTime,
      url: '/tasks',
    };
  }

  // Schedule reminder notifications
  scheduleReminderNotifications(reminders: Reminder[]): ScheduledNotification[] {
    if (!this.config.reminders.enabled) return [];

    const notifications: ScheduledNotification[] = [];
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    reminders.forEach(reminder => {
      const startDate = new Date(reminder.data_poczatkowa);
      
      // Calculate next occurrence
      let nextOccurrence = new Date(startDate);
      
      if (reminder.done) {
        const lastDone = new Date(reminder.done);
        nextOccurrence = new Date(lastDone.getTime() + reminder.powtarzanie * 24 * 60 * 60 * 1000);
      }

      // Only schedule if in the future
      if (nextOccurrence >= today) {
        const notificationTime = new Date(nextOccurrence);
        notificationTime.setHours(9, 0, 0, 0); // 9 AM

        if (notificationTime > now) {
          notifications.push({
            id: `reminder-${reminder.id}`,
            type: 'reminder',
            title: `Przypomnienie: ${reminder.tytul}`,
            body: `Powtarza się co ${reminder.powtarzanie} dni`,
            scheduledTime: notificationTime,
            data: { reminderId: reminder.id },
            url: '/tasks',
          });
        }
      }
    });

    return notifications;
  }

  // Schedule habit reminders
  scheduleHabitReminder(habits: DailyHabits): ScheduledNotification | null {
    if (!this.config.habits.enabled) return null;

    const today = new Date();
    const [hours, minutes] = this.config.habits.reminderTime.split(':').map(Number);
    const reminderTime = new Date();
    reminderTime.setHours(hours, minutes, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (reminderTime < new Date()) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    // Check which habits are not done
    const undoneHabits = Object.entries(habits)
      .filter(([key, value]) => {
        if (key === 'date' || key === 'user_name' || key === 'water_amount' || key === 'daily_spending') {
          return false;
        }
        return value === false;
      })
      .map(([key]) => key);

    if (undoneHabits.length === 0) return null;

    return {
      id: 'habit-reminder',
      type: 'habit',
      title: 'Dzisiaj - Nawyki',
      body: `Pamiętaj o ${undoneHabits.length} nawykach`,
      scheduledTime: reminderTime,
      url: '/tasks',
    };
  }

  // Schedule calendar event notifications
  scheduleCalendarNotifications(events: Event[]): ScheduledNotification[] {
    if (!this.config.calendar.enabled) return [];

    const notifications: ScheduledNotification[] = [];
    const now = new Date();

    events.forEach(event => {
      const eventTime = new Date(event.start_time);

      // Schedule reminders before event
      this.config.calendar.reminderMinutes.forEach(minutes => {
        const notificationTime = new Date(eventTime.getTime() - minutes * 60 * 1000);
        
        if (notificationTime > now) {
          notifications.push({
            id: `calendar-${event.id}-${minutes}`,
            type: 'calendar',
            title: `Wydarzenie: ${event.title}`,
            body: `Za ${minutes} minut${event.place ? ` w ${event.place}` : ''}`,
            scheduledTime: notificationTime,
            data: { eventId: event.id },
            url: '/calendar',
          });
        }
      });
    });

    return notifications;
  }

  // Get all scheduled notifications
  getAllScheduledNotifications(
    tasks: Task[],
    reminders: Reminder[],
    habits: DailyHabits | null,
    events: Event[]
  ): ScheduledNotification[] {
    const allNotifications: ScheduledNotification[] = [
      ...this.scheduleTaskNotifications(tasks),
      ...this.scheduleReminderNotifications(reminders),
      ...this.scheduleCalendarNotifications(events),
    ];

    const digest = this.scheduleDailyDigest(tasks);
    if (digest) allNotifications.push(digest);

    if (habits) {
      const habitReminder = this.scheduleHabitReminder(habits);
      if (habitReminder) allNotifications.push(habitReminder);
    }

    // Sort by scheduled time
    return allNotifications.sort((a, b) => 
      a.scheduledTime.getTime() - b.scheduledTime.getTime()
    );
  }

  // Update configuration
  updateConfig(newConfig: Partial<NotificationConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Helper function to send immediate notification
export async function sendImmediateNotification(
  title: string,
  body: string,
  options?: {
    icon?: string;
    badge?: string;
    tag?: string;
    url?: string;
  }
) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: options?.icon || '/icon.png',
        badge: options?.badge || '/icon.png',
        tag: options?.tag,
        data: {
          url: options?.url || '/',
          dateOfArrival: Date.now(),
        },
        requireInteraction: false,
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
}