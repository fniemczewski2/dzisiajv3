
export interface ReportTask {
  zadanie: string;
  data: string;
  osoba: string;
}

export interface Report {
  id: string;
  user_id: string;
  topic: string;
  date: string;
  agenda: string[];
  participants: string[];
  tasks: ReportTask[];
  notes: string;
  inserted_at: string;
  updated_at: string;
}