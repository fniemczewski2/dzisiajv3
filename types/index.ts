export type Task = {
  id: string;
  title: string;
  for_user: string;
  category: string;
  priority: number;
  description: string;
  due_date: string;
  status: string;
  scheduled_time?: string | null;
  user_name: string;
};

export type Bill = {
  id: string;
  amount: number;
  description: string;
  date: string;
  user_name: string;
  is_income: boolean;
  done: boolean | null;
};

export type Note = {
  id: string;
  title: string;
  items: string[];
  bg_color: string;
  user_name: string;
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
  user_name: string;
  share?: string;
  repeat: "none" | "weekly" | "monthly" | "yearly";
};

export type Settings = {
  sort_order: string;
  show_completed: boolean;
  show_habits: boolean;
  show_water_tracker: boolean;
  show_budget_items: boolean;
  show_notifications: boolean;
  users: string[];
  favorite_stops:{ name: string; zone_id: string }[];
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
  user_name: string;
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
  user_email: string;
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
  user_email: string;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  user_email: string;
  created_at?: string;
}

export interface ScheduleItem {
  time: string; 
  label: string;
}

export interface Schema {
  id?: string;
  user_name?: string;
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
  user_email: string;
  name: string;
  share: string | null;
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
  user_email: string;
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
  user_email: string;
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
  user_email: string;
  name: string;
  start_date: string;
  icon?: string;
  created_at?: string;
}

// types/movie.ts
export interface Movie {
  id: string;
  user_email: string;
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
  type: 'tram' | 'bus' | 'train';
}


