export interface Bill {
  id: string;
  user_id: string;
  amount: number;
  description: string | null;
  date: string;                   
  is_income: boolean;
  done: boolean | null;
  category_id: string | null;        
  is_recurring?: boolean;
  recurring_until?: string | null;     
  parent_bill_id?: string | null;      
  category?: BudgetCategory | null;
}

export interface RawBillRow {
  amount: number;
  date: string;
  category_id: string | null;
  is_income: boolean;
  done: boolean;
}

export interface ParsedTransaction {
  date: string; 
  description: string;
  is_income: boolean;
  amount: number;
  mappedCategory: string;
}

export interface BudgetCategory {
  id: string;
  user_id: string;
  year: number;
  name: string;
  monthly_amounts: number[];        
  is_monthly: boolean;   
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export type BudgetCategoryInsert = Omit<BudgetCategory, "id" | "user_id" | "created_at" | "updated_at">;

export interface CategorySpending {
  category: BudgetCategory;
  spent: number;         
  limit: number;         
  remaining: number;     
  thisMonthSpent: number;
  thisMonthLimit: number;
  thisMonthRemaining: number;
}

export interface UncategorisedSummary {
  spent: number;        
}

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

export interface SummaryItem {
  category: BudgetCategory;
  spent: number; 
  planned: number; 
  limit: number; 
  remaining: number; 
  thisMonthSpent: number;
  thisMonthPlanned: number;
  thisMonthLimit: number; 
  thisMonthRemaining: number;
}

export interface NbpResponse {
  table: string;
  currency: string;
  code: string;
  rates: { no: string; effectiveDate: string; mid: number }[];
}

export interface MonthData {
  sum?: number;
  rate?: number;
  budget?: number;
  income: number;
  doneExpense: number;
  plannedExpense: number;
  monthlySpending?: number;
}

export type YearData = Record<number, MonthData>;