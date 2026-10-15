// types/reports.ts


export interface ReportTask {
  zadanie: string;
  data: string;
  osoba: string;
  /** Id zadania w aplikacji, jeśli zostało z protokołu dodane do Zadań. */
  app_task_id?: string | null;
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
  /** Szablon PDF (id z ustawień); brak = szablon domyślny. */
  template_id?: string | null;
  inserted_at: string;
  updated_at: string;
}

/** Rola czcionki w szablonie protokołu. */
export type ReportFontRole = "title" | "heading" | "body";

export interface ReportTemplateAsset {
  /** Ścieżka w Supabase Storage (bucket report-templates): <user_id>/<plik>. */
  path: string;
  /** Oryginalna nazwa pliku – do wyświetlenia w ustawieniach. */
  name: string;
}

/** Szablon PDF protokołów: do trzech własnych czcionek i logo papieru firmowego. */
export interface ReportTemplate {
  fonts?: Partial<Record<ReportFontRole, ReportTemplateAsset>>;
  /** Kolor nagłówków (#RRGGBB); pozostałe kolory dokumentu wynikają z niego. */
  heading_color?: string | null;
  logo?: (ReportTemplateAsset & { width?: number }) | null;
}

/** Nazwany szablon (do 5 na użytkownika). */
export interface NamedReportTemplate extends ReportTemplate {
  id: string;
  name: string;
}

/** Zestaw szablonów zapisany w settings.report_template. */
export interface ReportTemplateSet {
  templates: NamedReportTemplate[];
  default_id: string | null;
}
