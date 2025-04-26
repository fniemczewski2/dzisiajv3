export type Task = {
  id: string;
  title: string;
  category: string;
  priority: number;
  description: string;
  due_date: string;
  deadline_date: string;
};

export type Bill = {
  id: string;
  amount: number;
  description: string;
  date: string;
};

export type Note = {
  id: string;
  title: string;
  items: string[];
  bg_color: string;
};