export interface Reminder {
  id: string;
  user_id: string;
  tytul: string;
  data_poczatkowa: string;
  powtarzanie: number;
  done: string | null;
}