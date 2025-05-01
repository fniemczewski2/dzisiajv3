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
};

export type Note = {
  id: string;
  title: string;
  items: string[];
  bg_color: string;
  user_name: string;
};

export type Settings = {
  sort_order: string;
  show_completed: boolean;
  show_habits: boolean;
  show_water_tracker: boolean;
  notification_enabled: boolean;
  notification_times: string;
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
