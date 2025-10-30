export type Task = {
  id: string;
  title: string;
  for_user: string;
  category: string;
  priority: number;
  description: string;
  due_date: string;
  deadline_date: string;
  status: string;
  user_name: string;
};

export type Bill = {
  id: string;
  amount: number;
  description: string;
  date: string;
  user_name: string;
  include_in_budget: boolean;
  done: boolean | null;
};

export type Note = {
  id: string;
  title: string;
  items: string[];
  bg_color: string;
  user_name: string;
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
};

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
  time: string; // "HH:mm"
  label: string;
}

export interface Schema {
  id?: string; // optional for new schemas before insertion
  user_name: string;
  schema_name: string;
  days: number[]; // 0 (Sunday) to 6 (Saturday)
  entries: ScheduleItem[]; // stored as JSONB in Supabase
  created_at?: string; // optional, returned from Supabase
}


export type RecipeInsert = Omit<Recipe, "id" | "created_at">;
