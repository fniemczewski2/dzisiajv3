export interface Person {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  relationship: string;
  priority: number; 
  birthday?: string | null;
  nameday?: string | null;
  phones: string[];
  emails: string[];
  notes?: string;
  last_contact_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type PersonInsert = Omit<Person, "id" | "user_id" | "created_at" | "updated_at">;