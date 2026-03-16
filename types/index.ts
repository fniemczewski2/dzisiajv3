// types/index.ts

export type Task = {
  id: string;
  title: string;
  for_user_id?: string | null;
  display_share_info?: string | null;
  category: string;
  priority: number;
  description: string;
  due_date: string;
  status: string;
  scheduled_time?: string | null;
  user_id: string;
};

export type Bill = {
  id: string;
  amount: number;
  description: string;
  date: string;
  user_id: string;
  is_income: boolean;
  done: boolean | null;
};

export type Note = {
  id: string;
  title: string;
  items: string[];
  bg_color: string;
  user_id: string;
  pinned?: boolean;
  archived?: boolean;
  updated_at?: string;
};

export type Event = {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  place?: string;
  user_id: string;
  shared_with_id?: string | null;
  shared_with_email?: string;
  display_share_info?: string | null;
  repeat: "none" | "weekly" | "monthly" | "yearly";
};

export type Settings = {
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

  habit_pills: boolean;
  habit_bath: boolean;
  habit_workout: boolean;
  habit_friends: boolean;
  habit_work: boolean;
  habit_housework: boolean;
  habit_plants: boolean;
  habit_duolingo: boolean;

  mood_options?: MoodOption[];
};

export type HabitKey =
  | "pills"
  | "bath"
  | "workout"
  | "friends"
  | "work"
  | "housework"
  | "plants"
  | "duolingo";

export interface DailyHabits {
  date: Date;
  user_id: string;
  pills: boolean;
  bath: boolean;
  workout: boolean;
  friends: boolean;
  work: boolean;
  housework: boolean;
  plants: boolean;
  duolingo: boolean;
  water_amount?: number | 0;
  daily_spending?: number | 0;
}

export type HabitRow = {
  date: string;
  pills: boolean;
  bath: boolean;
  workout: boolean;
  friends: boolean;
  work: boolean;
  housework: boolean;
  plants: boolean;
  duolingo: boolean;
};

export type Reminder = {
  id: string;
  user_id: string;
  tytul: string;
  data_poczatkowa: string;
  powtarzanie: number;
  done: string | null;
};

export type WaterRow = { date: string; amount: number };
export type MoneyRow = { date: string; daily_spending: number };

export type RecipeCategory =
  | "śniadanie"
  | "zupa"
  | "danie główne"
  | "przystawka"
  | "sałatka"
  | "deser";

export interface Recipe {
  id: string;
  name: string;
  category: RecipeCategory;
  products: string[];
  description: string;
  user_id: string;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  user_id: string;
  created_at?: string;
}

export interface ScheduleItem {
  time: string;
  label: string;
}

export interface Schema {
  id?: string;
  user_id?: string;
  name: string;
  days: number[];
  entries: ScheduleItem[];
  created_at?: string;
}

export interface ShoppingElement {
  id: string;
  text: string;
  completed: boolean;
}

export interface ShoppingList {
  id?: string;
  user_id: string;
  name: string;
  shared_with_id: string | null;
  shared_with_email?: string;
  display_share_info?: string;
  elements: ShoppingElement[];
  inserted_at?: string;
  updated_at?: string;
}

export type RecipeInsert = Omit<Recipe, "id" | "created_at">;

export interface ReportTask {
  zadanie: string;
  data: string;
  osoba: string;
}

export interface Report {
  id: string;
  user_id: string;
  topic: string;
  date: string;
  agenda: string[];
  participants: string[];
  tasks: ReportTask[];
  notes: string;
  inserted_at: string;
  updated_at: string;
}

export interface OpeningHours {
  [key: string]: string[];
}

export interface Place {
  id: string;
  user_id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  tags: string[];
  phone_number?: string;
  website?: string;
  rating?: number;
  notes?: string;
  google_place_id?: string;
  opening_hours?: OpeningHours;
  created_at: string;
  updated_at: string;
}

export interface GoogleMapsFeature {
  geometry: {
    coordinates: [number, number];
    type: string;
  };
  properties: {
    date?: string;
    google_maps_url?: string;
    location?: {
      address?: string;
      country_code?: string;
      name?: string;
    };
    Comment?: string;
  };
  type: string;
}

export interface GoogleMapsExport {
  type: string;
  features: GoogleMapsFeature[];
}

export type PlaceInsert = Omit<Place, "id" | "created_at" | "updated_at">;

export interface Streak {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  icon?: string;
  created_at?: string;
}

export interface Movie {
  id: string;
  user_id: string;
  title: string;
  genre: string | null;
  rating: number | null;
  platform: string | null;
  description: string | null;
  watched: boolean;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

export type MovieInsert = Omit<Movie, "id" | "created_at" | "updated_at">;
export type MovieUpdate = Partial<MovieInsert> & { id: string };

export interface Departure {
  id: string;
  line: string;
  destination: string;
  time: string;
  type: "tram" | "bus" | "train";
}

export interface MoodOption {
  id: string;
  label: string;
  color: string;
}

export interface MoodEntry {
  id: string;
  user_id: string;
  date: string;
  mood_id: string;
}

// ── Supabase RPC response types ───────────────────────────────────────────────
// Replaces `as any[]` casts in hooks.
// To generate full DB types run:
//   npx supabase gen types typescript --project-id <id> > types/database.ts

/** Row returned by get_emails_by_ids RPC */
export interface EmailByIdRow {
  id: string;
  email: string;
}

/** Row returned by get_emails_by_ids used in push subscription lookup */
export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  subscription: string | { endpoint: string; keys?: { p256dh: string; auth: string } };
  user_agent?: string;
  last_used?: string;
}

/** Settings row as returned from Supabase (all fields nullable — DB may not have them yet) */
export interface SettingsRow {
  sort_order: string | null;
  show_completed: boolean | null;
  show_habits: boolean | null;
  show_water_tracker: boolean | null;
  show_budget_items: boolean | null;
  show_mood_tracker: boolean | null;
  show_notifications: boolean | null;
  users: string[] | string | null;
  favorite_stops: { name: string; zone_id: string }[] | string | null;
  notif_morning_brief: boolean | null;
  notif_tasks: boolean | null;
  notif_events: boolean | null;
  notif_water: boolean | null;
  notif_habits: boolean | null;
  notif_evening: boolean | null;
  sort_notes: string | null;
  sort_shopping: string | null;
  sort_movies: string | null;
  sort_recipes: string | null;
  sort_places: string | null;
  habit_pills: boolean | null;
  habit_bath: boolean | null;
  habit_workout: boolean | null;
  habit_friends: boolean | null;
  habit_work: boolean | null;
  habit_housework: boolean | null;
  habit_plants: boolean | null;
  habit_duolingo: boolean | null;
  mood_options: MoodOption[] | null;
}

/** Stop row from the local stops table (transport module) */
export interface StopRow {
  stop_name: string;
  zone_id: string;
}

/** Budget row — hourly rates per month */
export interface BudgetRow {
  user_id: string;
  jan_rate: number;
  feb_rate: number;
  mar_rate: number;
  apr_rate: number;
  may_rate: number;
  jun_rate: number;
  jul_rate: number;
  aug_rate: number;
  sep_rate: number;
  oct_rate: number;
  nov_rate: number;
  dec_rate: number;
}

/** daily_habits row as returned from Supabase */
export interface DailyHabitsRow {
  date: string;
  user_id: string;
  pills: boolean | null;
  bath: boolean | null;
  workout: boolean | null;
  friends: boolean | null;
  work: boolean | null;
  housework: boolean | null;
  plants: boolean | null;
  duolingo: boolean | null;
  water_amount: number | null;
  daily_spending: number | null;
}