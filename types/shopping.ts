
export interface ShoppingElement {
  id: string;
  text: string;
  completed: boolean;
}

export interface ShoppingList {
  id?: string;
  user_id: string;
  name: string;
  shared_with_id: string | null;
  shared_with_email?: string;
  display_share_info?: string;
  elements: ShoppingElement[];
  inserted_at?: string;
  updated_at?: string;
}
