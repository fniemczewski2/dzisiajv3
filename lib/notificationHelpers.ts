import { useEffect } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface Reminder {
  id: string;
  title: string;
  description?: string;
  time: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
}

export function useReminderNotifications(reminders: Reminder[]) {
  const { isSubscribed, permission, scheduleNotification } = usePushNotifications();

  useEffect(() => {
    if (!isSubscribed || permission !== 'granted') return;

    // Sprawdź przypomnienia i zaplanuj powiadomienia
    const checkReminders = () => {
      const now = new Date();
      
      reminders.forEach(reminder => {
        if (!reminder.enabled) return;

        const [hours, minutes] = reminder.time.split(':').map(Number);
        const reminderTime = new Date();
        reminderTime.setHours(hours, minutes, 0, 0);

        // Jeśli przypomnienie jest w ciągu najbliższych 5 minut
        const timeDiff = reminderTime.getTime() - now.getTime();
        const fiveMinutes = 5 * 60 * 1000;

        if (timeDiff > 0 && timeDiff <= fiveMinutes) {
          scheduleNotification(
            reminder.title,
            reminder.description || 'Czas na zaplanowaną czynność',
            timeDiff
          );
        }
      });
    };

    // Sprawdzaj co minutę
    const interval = setInterval(checkReminders, 60 * 1000);
    checkReminders(); // Sprawdź od razu

    return () => clearInterval(interval);
  }, [reminders, isSubscribed, permission, scheduleNotification]);
}

// Funkcja pomocnicza do wysyłania powiadomienia o zadaniu
export function notifyTaskDue(taskTitle: string, dueDate: Date) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const now = new Date();
    const timeDiff = dueDate.getTime() - now.getTime();
    const oneHour = 60 * 60 * 1000;

    // Powiadom godzinę przed deadline
    if (timeDiff > 0 && timeDiff <= oneHour) {
      new Notification('Dzisiaj - Przypomnienie o zadaniu', {
        body: `Zadanie "${taskTitle}" kończy się za ${Math.round(timeDiff / (60 * 1000))} minut`,
        icon: '/icon.png',
        badge: '/icon.png',
        tag: `task-${taskTitle}`,
        requireInteraction: true,
      });
    }
  }
}

// Hook do monitorowania zadań z deadline
export function useTaskNotifications(tasks: Array<{ title: string; due_date: string; status: string }>) {
  const { isSubscribed, permission } = usePushNotifications();

  useEffect(() => {
    if (!isSubscribed || permission !== 'granted') return;

    const checkTasks = () => {
      const now = new Date();
      
      tasks.forEach(task => {
        if (task.status === 'done') return;
        
        const dueDate = new Date(task.due_date);
        notifyTaskDue(task.title, dueDate);
      });
    };

    // Sprawdzaj co 15 minut
    const interval = setInterval(checkTasks, 15 * 60 * 1000);
    checkTasks();

    return () => clearInterval(interval);
  }, [tasks, isSubscribed, permission]);
}