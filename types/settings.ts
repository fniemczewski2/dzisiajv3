import { MoodOption } from "./moods";

export interface Settings {
  sort_order: string;
  show_completed: boolean;
  show_habits: boolean;
  show_water_tracker: boolean;
  show_budget_items: boolean;
  show_notifications: boolean;
  show_mood_tracker: boolean;

  users: string[];
  favorite_stops: { name: string; zone_id: string }[];

  sort_notes: string;
  sort_shopping: string;
  sort_movies: string;
  sort_recipes: string;
  sort_places: string;

  notif_morning_brief: boolean;
  notif_tasks: boolean;
  notif_events: boolean;
  notif_water: boolean;
  notif_habits: boolean;
  notif_evening: boolean;
  notif_birthdays: boolean; // <-- DODANO
  notif_contact: boolean;

  habit_pills: boolean;
  habit_bath: boolean;
  habit_workout: boolean;
  habit_friends: boolean;
  habit_work: boolean;
  habit_housework: boolean;
  habit_plants: boolean;
  habit_duolingo: boolean;

  mood_options?: MoodOption[];
  main_view: string;

  sort_people: string;
  hide_priority_5: boolean;
}

export interface EmailByIdRow {
  id: string;
  email: string;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  subscription: string | { endpoint: string; keys?: { p256dh: string; auth: string } };
  user_agent?: string;
  last_used?: string;
}