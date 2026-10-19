// lib/reportExport.ts
//
// Eksport protokołu ze spotkania do Markdown i PDF. Oba formaty mają tę samą,
// dotychczasową kolejność sekcji:
//   nagłówek (temat, data) → agenda → obecni (moderacja, protokół,
//   pozostali) → ustalenia i zadania (tabela) → notatki.
// Puste wiersze z dawnego formularza (12 punktów agendy, 8 zadań) nie są już
// drukowane – dokument pokazuje tylko to, co zostało wpisane.

import { REPORT_LOGO_MAX_HEIGHT } from "@/config/limits";
import type { Report, ReportFontRole, ReportTask } from "@/types/reports";
import type { LoadedReportTemplate } from "./reportTemplate";
import { derivePalette, type ReportPalette } from "./reportColors";

export interface ReportParticipant {
  role: "Moderacja" | "Protokół" | null;
  name: string;
}

/** dd.MM.yyyy z „yyyy-MM-dd” (bez przesunięć strefy czasowej). */
export function formatReportDate(value: string | null | undefined): string {
  if (!value) return "";
  const [y, m, d] = value.slice(0, 10).split("-");
  return y && m && d ? `${d}.${m}.${y}` : value;
}

const clean = (items: readonly string[] | null | undefined) =>
  (items ?? []).map((s) => (s ?? "").trim()).filter(Boolean);

export function reportAgenda(report: Report): string[] {
  return clean(report.agenda);
}

/** Pierwsza osoba to moderacja, druga – protokół (jak w dotychczasowym PDF). */
export function reportParticipants(report: Report): ReportParticipant[] {
  return (report.participants ?? [])
    .map((name, i) => ({ name: (name ?? "").trim(), index: i }))
    .filter((p) => p.name)
    .map(({ name, index }) => {
      let role: ReportParticipant["role"] = null;
      if (index === 0) role = "Moderacja";
      else if (index === 1) role = "Protokół";
      return { role, name };
    });
}

export function reportTasks(report: Report): ReportTask[] {
  return (report.tasks ?? []).filter((t) => (t?.zadanie ?? "").trim());
}

/** Nazwa pliku bez polskich znaków i spacji: protokol-2026-10-15-zarzad-fundacji. */
export function reportFileName(report: Report, ext: "pdf" | "md"): string {
  const slug = (report.topic || "spotkanie")
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll("ł", "l")
    .replaceAll("Ł", "L")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-");
  const parts = ["protokol", report.date?.slice(0, 10), trimDashes(slug).slice(0, 60)].filter(Boolean);
  return `${parts.join("-")}.${ext}`;
}

/** Usuwa myślniki z obu końców (liniowo, bez regexu z alternatywą kotwic). */
function trimDashes(text: string): string {
  let start = 0;
  let end = text.length;
  while (start < end && text[start] === "-") start++;
  while (end > start && text[end - 1] === "-") end--;
  return text.slice(start, end);
}

// --- Markdown -----------------------------------------------------------------

/** Komórka tabeli Markdown: bez znaków łamiących tabelę. */
function mdCell(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("|", "\\|").replaceAll(/\r?\n/g, " ").trim() || "—";
}

export function buildReportMarkdown(report: Report): string {
  const lines: string[] = [];
  const agenda = reportAgenda(report);
  const people = reportParticipants(report);
  const tasks = reportTasks(report);

  lines.push(`# ${report.topic?.trim() || "Protokół ze spotkania"}`, "");
  if (report.date) lines.push(`**Data spotkania:** ${formatReportDate(report.date)}`, "");

  lines.push("## Agenda", "");
  if (agenda.length) agenda.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
  else lines.push("_Brak punktów agendy._");
  lines.push("");

  lines.push("## Obecni", "");
  if (people.length) {
    for (const p of people) {
      const role = p.role ? `**${p.role}:** ` : "";
      lines.push(`- ${role}${p.name}`);
    }
  } else lines.push("_Brak listy osób._");
  lines.push("");

  lines.push("## Ustalenia i zadania", "");
  if (tasks.length) {
    lines.push("| Lp. | Zadanie | Termin | Odpowiada |", "| ---: | --- | --- | --- |");
    tasks.forEach((t, i) =>
      lines.push(`| ${i + 1} | ${mdCell(t.zadanie)} | ${mdCell(formatReportDate(t.data))} | ${mdCell(t.osoba ?? "")} |`)
    );
  } else {
    lines.push("_Brak zadań._");
  }
  lines.push("");

  lines.push("## Notatki", "");
  // Pojedyncze złamania linii jako twarde (dwie spacje), żeby Markdown ich nie sklejał.
  const notes = report.notes?.trim().replaceAll(/([^\n])\n(?!\n)/g, "$1  \n");
  lines.push(notes || "_Brak notatek._", "");

  return lines.join("\n");
}

// --- PDF (pdfmake) --------------------------------------------------------------
//
// Układ jak zwykły dokument, nie plakat: bez teł, ozdobnych kresek i etykiet
// wersalikami. Hierarchię robi wielkość i kolor nagłówków (jeden kolor
// wybrany w szablonie), a linie są tylko tam, gdzie porządkują tabelę.

type Content = Record<string, unknown> | string | Content[];

const longDate = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" });

/** „15 października 2026” – data w nagłówku pisana jak w piśmie. */
function formatReportLongDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? formatReportDate(value) : longDate.format(d);
}

const sectionTitle = (text: string): Content => ({ text, style: "sectionTitle" });

const empty = (text: string): Content => ({ text, style: "empty" });

// Bloki sekcji zawsze zwracają { stack: [...] } – jeden kształt niezależnie od tego, czy sekcja jest pusta.
function agendaBlock(agenda: string[]): Content {
  // Agenda to kolejność obrad – numeracja niesie informację.
  const body: Content =
    agenda.length === 0
      ? empty("Brak punktów agendy")
      : { ol: agenda.map((item) => ({ text: item, margin: [0, 1, 0, 1] })), style: "list" };
  return { stack: [body] };
}

function peopleBlock(people: ReportParticipant[]): Content {
  if (people.length === 0) return { stack: [empty("Brak listy osób")] };
  return {
    stack: people.map((p) =>
      p.role
        ? { text: [{ text: `${p.role}: `, style: "role" }, { text: p.name }], margin: [0, 1, 0, 1] }
        : { text: p.name, margin: [0, 1, 0, 1] }
    ),
  };
}

function tasksBlock(tasks: ReportTask[], palette: ReportPalette): Content {
  if (tasks.length === 0) return { stack: [empty("Brak zadań")] };
  const header = ["", "Zadanie", "Termin", "Odpowiada"].map((t) => ({ text: t, style: "tableHeader" }));
  const rows = tasks.map((t, i) => [
    { text: `${i + 1}.`, alignment: "right", color: palette.muted },
    { text: t.zadanie.trim() },
    { text: formatReportDate(t.data) || "–", noWrap: true },
    { text: t.osoba?.trim() || "–" },
  ]);
  return {
    table: { headerRows: 1, widths: [16, "*", 58, 120], body: [header, ...rows], dontBreakRows: true },
    layout: {
      // Linia pod nagłówkiem tabeli i cienkie linie między wierszami – bez teł.
      hLineWidth: (i: number, node: { table: { body: unknown[] } }) => {
        if (i === 1) return 0.75;
        return i === 0 || i === node.table.body.length ? 0 : 0.4;
      },
      hLineColor: (i: number) => (i === 1 ? palette.ruleStrong : palette.rule),
      vLineWidth: () => 0,
      paddingLeft: (i: number) => (i === 0 ? 0 : 6),
      paddingRight: () => 6,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    },
  };
}

/** Nazwy czcionek zarejestrowanych w pdfmake dla ról szablonu. */
export const TEMPLATE_FONT_NAMES: Record<ReportFontRole, string> = {
  title: "TemplateTitle",
  heading: "TemplateHeading",
  body: "TemplateBody",
};

export interface ReportLayoutOptions {
  /** Role, dla których zarejestrowano własną czcionkę. */
  fonts?: Partial<Record<ReportFontRole, boolean>>;
  /** Logo papieru firmowego (obok tytułu, po prawej). */
  logo?: { dataUrl: string; width: number };
  /** Kolor nagłówków; z niego wynikają pozostałe kolory dokumentu. */
  headingColor?: string | null;
}

/**
 * Czcionki ról z kaskadą: treść → domyślna Roboto, nagłówki → treść,
 * tytuł → nagłówki. Jedna wgrana czcionka „treści” zmienia więc cały dokument.
 */
export function resolveReportFonts(fonts: ReportLayoutOptions["fonts"] = {}): Record<ReportFontRole, string> {
  const body = fonts.body ? TEMPLATE_FONT_NAMES.body : "Roboto";
  const heading = fonts.heading ? TEMPLATE_FONT_NAMES.heading : body;
  const title = fonts.title ? TEMPLATE_FONT_NAMES.title : heading;
  return { title, heading, body };
}

function titleBlock(title: string, date: string, logo?: { dataUrl: string; width: number }): Content {
  const text = {
    stack: [
      { text: title, style: "title" },
      { text: date ? date : "Protokół ze spotkania", style: "date" },
    ],
  };
  if (!logo) return text;
  return {
    columns: [
      { width: "*", ...text },
      { width: logo.width, image: logo.dataUrl, fit: [logo.width, REPORT_LOGO_MAX_HEIGHT], alignment: "right" },
    ],
    columnGap: 10,
  };
}

export function buildReportDocDefinition(report: Report, options: ReportLayoutOptions = {}) {
  const font = resolveReportFonts(options.fonts);
  const palette = derivePalette(options.headingColor);
  const logo = options.logo;
  const title = report.topic?.trim() || "Protokół ze spotkania";
  const date = formatReportLongDate(report.date);
  const agenda = reportAgenda(report);
  const people = reportParticipants(report);
  const tasks = reportTasks(report);

  return {
    pageSize: "A4",
    pageMargins: [50, 50, 50, 50],
    info: { title: `Protokół – ${title}`, subject: "Protokół ze spotkania", creator: "Dzisiaj.Fun" },
    content: [
      titleBlock(title, date, logo),
      {
        columns: [
          { width: "*", stack: [sectionTitle("Agenda"), agendaBlock(agenda)] },
          { width: 10, text: "" },
          { width: "*", stack: [sectionTitle("Obecni"), peopleBlock(people)] },
        ],
      },
      sectionTitle("Zadania"),
      tasksBlock(tasks, palette),
      sectionTitle("Notatki"),
      report.notes?.trim() ? { text: report.notes.trim(), style: "notes" } : empty("Brak notatek"),
    ],
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: title, style: "footer" },
        { text: `${currentPage} / ${pageCount}`, style: "footer", alignment: "right" },
      ],
      margin: [50, 20, 50, 0],
    }),
    styles: {
      title: { font: font.title, fontSize: 24, bold: true, color: palette.heading, lineHeight: 1.1 },
      date: { font: font.body, fontSize: 11, color: palette.muted, margin: [0, 4, 0, 0] },
      sectionTitle: { font: font.heading, fontSize: 12.5, bold: true, color: palette.heading, margin: [0, 22, 0, 6] },
      list: { markerColor: palette.heading },
      role: { color: palette.muted },
      tableHeader: { font: font.heading, bold: true, color: palette.heading, fontSize: 9.5 },
      notes: { lineHeight: 1.4 },
      empty: { color: palette.muted },
      footer: { fontSize: 8, color: palette.muted },
    },
    defaultStyle: { font: font.body, fontSize: 10.5, color: palette.ink, lineHeight: 1.25 },
  };
}

// --- Pobieranie -------------------------------------------------------------------

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadReportMarkdown(report: Report): void {
  const blob = new Blob([buildReportMarkdown(report)], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, reportFileName(report, "md"));
}

type PdfMakeInstance = {
  vfs?: unknown;
  addVirtualFileSystem?: (vfs: unknown) => void;
  addFonts?: (fonts: unknown) => void;
  fonts?: Record<string, unknown>;
  createPdf: (def: unknown) => { download: (name: string) => unknown; open: (win?: Window | null) => unknown };
};

async function loadPdfMake(
  template?: LoadedReportTemplate
): Promise<{ pdf: PdfMakeInstance; options: ReportLayoutOptions }> {
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
  const pdfMake = (pdfMakeModule as { default?: unknown }).default ?? pdfMakeModule;
  const pdfFonts = (pdfFontsModule as { default?: unknown }).default ?? pdfFontsModule;
  const fonts = pdfFonts as { pdfMake?: { vfs: unknown }; vfs?: unknown };
  const pdf = pdfMake as PdfMakeInstance;
  const standardVfs = fonts.pdfMake?.vfs ?? fonts.vfs ?? pdfFonts;

  // pdfmake 0.3 ma addVirtualFileSystem; starsze wersje – przypisanie vfs.
  if (typeof pdf.addVirtualFileSystem === "function") pdf.addVirtualFileSystem(standardVfs);
  else pdf.vfs = standardVfs;

  const options: ReportLayoutOptions = { fonts: {}, logo: template?.logo, headingColor: template?.headingColor };
  const custom: Record<string, unknown> = {};
  const customVfs: Record<string, string> = {};
  for (const role of Object.keys(TEMPLATE_FONT_NAMES) as ReportFontRole[]) {
    const data = template?.fonts[role];
    if (!data) continue;
    const file = `template-${role}.font`;
    customVfs[file] = data;
    // Jeden plik na rolę – ten sam dla wszystkich odmian (bez sztucznego pogrubienia).
    custom[TEMPLATE_FONT_NAMES[role]] = { normal: file, bold: file, italics: file, bolditalics: file };
    options.fonts![role] = true;
  }
  if (Object.keys(custom).length > 0) {
    if (typeof pdf.addVirtualFileSystem === "function") pdf.addVirtualFileSystem(customVfs);
    else pdf.vfs = { ...(pdf.vfs as object), ...customVfs };
    if (typeof pdf.addFonts === "function") pdf.addFonts(custom);
    else pdf.fonts = { ...pdf.fonts, ...custom };
  }
  return { pdf, options };
}

export async function downloadReportPDF(report: Report, template?: LoadedReportTemplate): Promise<void> {
  if (typeof window === "undefined") return;
  const { pdf, options } = await loadPdfMake(template);
  await pdf.createPdf(buildReportDocDefinition(report, options)).download(reportFileName(report, "pdf"));
}

/** Protokół z przykładowymi danymi – podgląd szablonu. */
export const SAMPLE_REPORT: Report = {
  id: "podglad",
  user_id: "",
  topic: "Posiedzenie zarządu – przykład",
  date: new Date().toISOString().slice(0, 10),
  agenda: ["Sprawozdanie z realizacji projektu", "Budżet na kolejny kwartał", "Sprawy różne"],
  participants: ["Anna Kowalska", "Jan Nowak", "Zofia Wiśniewska"],
  tasks: [
    { zadanie: "Przygotować sprawozdanie merytoryczne", data: "", osoba: "Anna Kowalska" },
    { zadanie: "Zebrać oferty na catering (zażółć gęślą jaźń)", data: "", osoba: "Jan Nowak" },
  ],
  notes: "Zażółć gęślą jaźń – ZAŻÓŁĆ GĘŚLĄ JAŹŃ. Ten akapit sprawdza polskie znaki w czcionce treści.",
  inserted_at: "",
  updated_at: "",
};

/**
 * Otwiera podgląd szablonu w nowej karcie. Kartę trzeba otworzyć od razu po
 * kliknięciu (`win`) – po pobraniu czcionek przeglądarka (zwłaszcza Safari)
 * zablokowałaby ją jako wyskakujące okno.
 */
export async function previewReportTemplate(template?: LoadedReportTemplate, win?: Window | null): Promise<void> {
  if (typeof window === "undefined") return;
  const { pdf, options } = await loadPdfMake(template);
  await pdf.createPdf(buildReportDocDefinition(SAMPLE_REPORT, options)).open(win ?? null);
}
