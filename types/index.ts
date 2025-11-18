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
  time: string; // "HH:mm"
  label: string;
}

export interface Schema {
  id?: string; // optional for new schemas before insertion
  user_name: string;
  name: string;
  days: number[]; // 0 (Sunday) to 6 (Saturday)
  entries: ScheduleItem[]; // stored as JSONB in Supabase
  created_at?: string; // optional, returned from Supabase
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

