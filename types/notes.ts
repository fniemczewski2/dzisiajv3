export interface Note {
  id: string;
  title: string;
  items: string[];
  bg_color: string;
  user_id: string;
  pinned?: boolean;
  archived?: boolean;
  updated_at?: string;
}
