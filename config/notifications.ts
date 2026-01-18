// config/notificationDefaults.ts
export interface NotificationConfig {
  tasks: {
    enabled: boolean;
    reminderMinutes: number[];
    dailyDigest: boolean;
    digestTime: string;
  };
  reminders: {
    enabled: boolean;
    exactTime: boolean;
  };
  habits: {
    enabled: boolean;
    reminderTime: string;
  };
  calendar: {
    enabled: boolean;
    reminderMinutes: number[];
  };
}

export const NOTIFICATION_CONFIG: NotificationConfig = {
  tasks: {
    enabled: true,
    reminderMinutes: [],     // Remind 1 hour and 15 min before
    dailyDigest: true,              // Morning task summary
    digestTime: "08:00"             // When to send digest
  },
  reminders: {
    enabled: true,
    exactTime: true                 // Send at exact scheduled time
  },
  habits: {
    enabled: true,
    reminderTime: "20:00"           // Evening habit reminder
  },
  calendar: {
    enabled: true,
    reminderMinutes: [10080, 1440, 60, 5]       // Remind before events
  }
};

// Helper function to merge user config with defaults
export function mergeWithDefaults(userConfig: Partial<NotificationConfig>): NotificationConfig {
  return {
    tasks: {
      ...NOTIFICATION_CONFIG.tasks,
      ...userConfig.tasks
    },
    reminders: {
      ...NOTIFICATION_CONFIG.reminders,
      ...userConfig.reminders
    },
    habits: {
      ...NOTIFICATION_CONFIG.habits,
      ...userConfig.habits
    },
    calendar: {
      ...NOTIFICATION_CONFIG.calendar,
      ...userConfig.calendar
    }
  };
}

// Validation function
export function validateNotificationConfig(config: any): config is NotificationConfig {
  return (
    config &&
    typeof config === 'object' &&
    config.tasks &&
    typeof config.tasks.enabled === 'boolean' &&
    Array.isArray(config.tasks.reminderMinutes) &&
    typeof config.tasks.dailyDigest === 'boolean' &&
    typeof config.tasks.digestTime === 'string' &&
    config.reminders &&
    typeof config.reminders.enabled === 'boolean' &&
    typeof config.reminders.exactTime === 'boolean' &&
    config.habits &&
    typeof config.habits.enabled === 'boolean' &&
    typeof config.habits.reminderTime === 'string' &&
    config.calendar &&
    typeof config.calendar.enabled === 'boolean' &&
    Array.isArray(config.calendar.reminderMinutes)
  );
}