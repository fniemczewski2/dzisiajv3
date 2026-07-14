
export type HabitKey =
  | "pills"
  | "bath"
  | "workout"
  | "friends"
  | "work"
  | "housework"
  | "plants"
  | "duolingo";

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

export interface WaterRow {
  date: string;
  amount: number;
}

export interface MoneyRow {
  date: string;
  daily_spending: number;
}