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
export type WaterRow = { date: string; amount: number };
export type MoneyRow = { date: string; daily_spending: number };
