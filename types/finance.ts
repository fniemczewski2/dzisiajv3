// types/finance.ts
//
// Finanse (od 1.40): profile, rachunki stałe (zaplanowane, z regułą
// powtarzania) i transakcje (faktyczne wpływy/wydatki).

import type { RecurrenceRule } from "@/shared/recurrence";

export interface FinanceProfile {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  sort_order: number;
}

export interface RecurringBill {
  id: string;
  user_id: string;
  profile_id: string | null;
  name: string;
  amount: number;
  category_id: string | null;
  /** Pierwszy termin (yyyy-MM-dd). */
  start_date: string;
  /** null = rachunek jednorazowy. */
  recurrence: RecurrenceRule | null;
  active: boolean;
}

export type TransactionLinkStatus = "manual" | "suggested";

export interface Transaction {
  id: string;
  user_id: string;
  profile_id: string | null;
  date: string;
  amount: number;
  is_income: boolean;
  description: string;
  category_id: string | null;
  recurring_bill_id: string | null;
  link_status: TransactionLinkStatus | null;
  source: "manual" | "csv" | "legacy";
  import_key: string | null;
}

export type NewTransaction = Omit<Transaction, "id" | "user_id">;
