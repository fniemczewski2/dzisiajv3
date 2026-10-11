// types/habits.ts


export type HabitKey =
  | "pills"
  | "bath"
  | "workout"
  | "friends"
  | "work"
  | "housework"
  | "plants"
  | "duolingo";

/** Nawyk zdefiniowany przez użytkownika (max 8). `id` dawnych nawyków = ich HabitKey. */
export interface HabitDef {
  id: string;
  label: string;
  /** Nazwa ikony z HABIT_ICON_NAMES. */
  icon: string;
}

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
  /** Odhaczone nawyki: id nawyku → true (od 1.40). */
  habits_done?: Record<string, boolean> | null;
}

export interface WaterRow {
  date: string;
  amount: number;
}

export interface MoneyRow {
  date: string;
  daily_spending: number;
}
