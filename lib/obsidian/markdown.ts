// lib/obsidian/markdown.ts
//
// Notatki, przepisy, osoby i protokoły jako Markdown z nagłówkiem YAML (format Obsidiana) i z powrotem.
// Nagłówek zawsze zawiera dzisiaj_id i dzisiaj_type – po nich synchronizacja rozpoznaje wpis.

import type { Note } from "@/types/notes";
import type { Recipe } from "@/types/recipes";
import type { Person } from "@/types/people";
import type { Report, ReportTask } from "@/types/reports";
import { parseFrontMatter, stringifyFrontMatter, type FrontMatter } from "@/lib/obsidian/frontMatter";
import type { VaultItemType } from "@/lib/obsidian/paths";

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
const optional = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

function bulletList(items: readonly string[]): string {
  return items.map((i) => `- ${i}`).join("\n");
}

/** Sekcje „## Nagłówek” → treść. */
function sections(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  let current = "";
  for (const line of body.split("\n")) {
    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h) {
      current = h[1].toLowerCase();
      out[current] = "";
    } else if (current) {
      out[current] += `${line}\n`;
    }
  }
  for (const k of Object.keys(out)) out[k] = out[k].trim();
  return out;
}

function bullets(text: string | undefined): string[] {
  return (text ?? "")
    .split("\n")
    .map((l) => /^\s*[-*]\s+(.*)$/.exec(l)?.[1]?.trim() ?? "")
    .filter(Boolean);
}

function header(type: VaultItemType, id: string, updated: string | undefined, extra: FrontMatter): string {
  return stringifyFrontMatter({ dzisiaj_id: id, dzisiaj_type: type, updated: updated ?? null, ...extra });
}

// --- Notatki ------------------------------------------------------------------
export function noteToMarkdown(note: Note & { folder?: string | null }): string {
  return `${header("note", note.id, note.updated_at, { title: note.title, folder: note.folder ?? null, pinned: Boolean(note.pinned) })}\n${note.items.join("\n")}\n`;
}

export function noteFromMarkdown(
  text: string,
  fallbackTitle: string
): Pick<Note, "title" | "items"> & { folder: string | null } {
  const { data, body } = parseFrontMatter(text);
  const items = body.replace(/\n+$/, "").split("\n");
  while (items.length > 0 && items[0].trim() === "") items.shift();
  return { title: str(data.title) || fallbackTitle, items, folder: optional(data.folder) };
}

// --- Przepisy -------------------------------------------------------------------
export function recipeToMarkdown(recipe: Recipe): string {
  return `${header("recipe", recipe.id, recipe.created_at, { name: recipe.name, category: recipe.category })}
## Składniki
${bulletList(recipe.products)}

## Przygotowanie
${recipe.description}
`;
}

export function recipeFromMarkdown(
  text: string,
  fallbackName: string
): Pick<Recipe, "name" | "products" | "description"> & { category: string } {
  const { data, body } = parseFrontMatter(text);
  const s = sections(body);
  return {
    name: str(data.name) || fallbackName,
    category: str(data.category),
    products: bullets(s["składniki"]),
    description: s["przygotowanie"] ?? body.trim(),
  };
}

// --- Osoby ------------------------------------------------------------------------
export function personToMarkdown(person: Person): string {
  return `${header("person", person.id, person.created_at, {
    first_name: person.first_name,
    last_name: person.last_name,
    relationship: person.relationship,
    priority: person.priority,
    birthday: person.birthday ?? null,
    nameday: person.nameday ?? null,
    phones: person.phones,
    emails: person.emails,
    last_contact_date: person.last_contact_date ?? null,
  })}\n${person.notes ?? ""}\n`;
}

export function personFromMarkdown(text: string): Partial<Person> {
  const { data, body } = parseFrontMatter(text);
  const priority = typeof data.priority === "number" ? data.priority : Number(data.priority);
  return {
    first_name: str(data.first_name),
    last_name: str(data.last_name),
    relationship: str(data.relationship),
    ...(Number.isFinite(priority) ? { priority } : {}),
    birthday: optional(data.birthday),
    nameday: optional(data.nameday),
    phones: list(data.phones),
    emails: list(data.emails),
    last_contact_date: optional(data.last_contact_date),
    notes: body.trim(),
  };
}

// --- Protokoły -----------------------------------------------------------------------
const TASK_LINE = /^- \[[ xX]\]\s+(.+?)(?:\s+—\s+(.*?))?(?:\s+—\s+(\d{4}-\d{2}-\d{2}))?\s*$/;

export function reportToMarkdown(report: Report): string {
  const tasks = report.tasks.map(
    (t) => `- [ ] ${t.zadanie}${t.osoba ? ` — ${t.osoba}` : ""}${t.data ? ` — ${t.data}` : ""}`
  );
  return `${header("report", report.id, undefined, { topic: report.topic, date: report.date, participants: report.participants })}
## Porządek
${bulletList(report.agenda)}

## Zadania
${tasks.join("\n")}

## Notatki
${report.notes}
`;
}

/** Zadania odzyskują app_task_id z dotychczasowego protokołu (dopasowanie po treści i osobie). */
export function reportFromMarkdown(text: string, previous?: Pick<Report, "tasks">): Partial<Report> {
  const { data, body } = parseFrontMatter(text);
  const s = sections(body);
  const tasks: ReportTask[] = (s["zadania"] ?? "")
    .split("\n")
    .map((l) => TASK_LINE.exec(l.trim()))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => {
      const task: ReportTask = { zadanie: m[1].trim(), osoba: (m[2] ?? "").trim(), data: m[3] ?? "" };
      const match = previous?.tasks.find((p) => p.zadanie === task.zadanie && p.osoba === task.osoba);
      return match?.app_task_id ? { ...task, app_task_id: match.app_task_id } : task;
    });
  return {
    topic: str(data.topic),
    date: str(data.date),
    participants: list(data.participants),
    agenda: bullets(s["porządek"]),
    tasks,
    notes: s["notatki"] ?? "",
  };
}

/** Identyfikator i typ z nagłówka pliku (null dla plików utworzonych w Obsidianie). */
export function vaultIdentity(text: string): { id: string | null; type: string | null; conflictOf: string | null } {
  const { data } = parseFrontMatter(text);
  return {
    id: optional(data.dzisiaj_id),
    type: optional(data.dzisiaj_type),
    conflictOf: optional(data.dzisiaj_conflict_of),
  };
}
