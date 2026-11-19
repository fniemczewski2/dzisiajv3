// lib/obsidian/markdown.ts
//
// Notatki, przepisy, osoby i protokoły jako Markdown z nagłówkiem YAML (format Obsidiana) i z powrotem.
// Nagłówek zawsze zawiera dzisiaj_id i dzisiaj_type – po nich synchronizacja rozpoznaje wpis.

import { trimChars } from "@/lib/text";
import type { Note } from "@/types/notes";
import type { Recipe } from "@/types/recipes";
import type { Person } from "@/types/people";
import type { Report, ReportTask } from "@/types/reports";
import { parseFrontMatter, stringifyFrontMatter, type FrontMatter } from "@/lib/obsidian/frontMatter";
import type { VaultItemType } from "@/lib/obsidian/paths";
import { fromObsidianLinks, obsidianTag, toObsidianLinks } from "@/lib/mentions";

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
    const heading = /^##\s/.test(line) ? line.slice(2).trim() : "";
    if (heading) {
      current = heading.toLowerCase();
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
    .map((l) => {
      const t = l.trimStart();
      return t.startsWith("- ") || t.startsWith("* ") ? t.slice(2).trim() : "";
    })
    .filter(Boolean);
}

function header(type: VaultItemType, id: string, updated: string | undefined, extra: FrontMatter): string {
  return stringifyFrontMatter({ dzisiaj_id: id, dzisiaj_type: type, updated: updated ?? null, ...extra });
}

/**
 * Plik z treścią: powiązania @/!/$ → [[Nazwa]]; nagłówek dostaje `tags` (kategoria wpisu, rodzaj pliku
 * i rodzaje powiązań) oraz `dzisiaj_links` (do odtworzenia znaczników przy imporcie).
 */
function vaultDocument(
  type: VaultItemType,
  id: string,
  updated: string | undefined,
  extra: FrontMatter,
  body: string,
  ownTags: readonly (string | null | undefined)[]
): string {
  const converted = toObsidianLinks(body);
  const tags = [...new Set([...ownTags.map(obsidianTag), ...converted.tags].filter((t): t is string => Boolean(t)))];
  const meta: FrontMatter = { ...extra };
  if (tags.length > 0) meta.tags = tags;
  if (converted.links.length > 0) meta.dzisiaj_links = converted.links;
  return `${header(type, id, updated, meta)}\n${converted.text}`;
}

/** Treść pliku po imporcie: [[Nazwa]] z listy dzisiaj_links wraca do znacznika @/!/$. */
function restoreLinks(data: FrontMatter, body: string): string {
  return fromObsidianLinks(body, list(data.dzisiaj_links));
}

/** Najwyższy folder notatki jako kategoria („Fundacje/Zapłon” → „Fundacje”). */
function topFolder(folder: string | null | undefined): string | null {
  return folder?.split("/")[0]?.trim() || null;
}

// --- Notatki ------------------------------------------------------------------
export function noteToMarkdown(note: Note & { folder?: string | null }): string {
  return vaultDocument(
    "note",
    note.id,
    note.updated_at,
    { title: note.title, folder: note.folder ?? null, pinned: Boolean(note.pinned) },
    `${note.items.join("\n")}\n`,
    [topFolder(note.folder)]
  );
}

export function noteFromMarkdown(
  text: string,
  fallbackTitle: string
): Pick<Note, "title" | "items"> & { folder: string | null } {
  const { data, body } = parseFrontMatter(text);
  const items = trimChars(restoreLinks(data, body), "\n", "end").split("\n");
  while (items.length > 0 && items[0].trim() === "") items.shift();
  return { title: str(data.title) || fallbackTitle, items, folder: optional(data.folder) };
}

// --- Przepisy -------------------------------------------------------------------
export function recipeToMarkdown(recipe: Recipe): string {
  return vaultDocument(
    "recipe",
    recipe.id,
    recipe.created_at,
    { name: recipe.name, category: recipe.category },
    `## Składniki
${bulletList(recipe.products)}

## Przygotowanie
${recipe.description}
`,
    [recipe.category, "przepis"]
  );
}

export function recipeFromMarkdown(
  text: string,
  fallbackName: string
): Pick<Recipe, "name" | "products" | "description"> & { category: string } {
  const { data, body: rawBody } = parseFrontMatter(text);
  const body = restoreLinks(data, rawBody);
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
  return vaultDocument(
    "person",
    person.id,
    person.created_at,
    {
      first_name: person.first_name,
      last_name: person.last_name,
      relationship: person.relationship,
      priority: person.priority,
      birthday: person.birthday ?? null,
      nameday: person.nameday ?? null,
      phones: person.phones,
      emails: person.emails,
      last_contact_date: person.last_contact_date ?? null,
    },
    `${person.notes ?? ""}\n`,
    [person.relationship, "osoba"]
  );
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
    notes: restoreLinks(data, body).trim(),
  };
}

// --- Protokoły -----------------------------------------------------------------------
const TASK_PREFIXES = ["- [ ] ", "- [x] ", "- [X] "];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** „- [ ] zadanie — osoba — RRRR-MM-DD” → części; osoba i data opcjonalne. */
function parseTaskLine(line: string): ReportTask | null {
  const prefix = TASK_PREFIXES.find((p) => line.startsWith(p));
  if (!prefix) return null;
  const parts = line
    .slice(prefix.length)
    .split("—")
    .map((p) => p.trim());
  const data = parts.length > 1 && ISO_DAY.test(parts.at(-1) ?? "") ? (parts.pop() as string) : "";
  const zadanie = parts.shift() ?? "";
  return zadanie ? { zadanie, osoba: parts.join(" — "), data } : null;
}

function taskToLine(t: ReportTask): string {
  const osoba = t.osoba ? ` — ${t.osoba}` : "";
  const data = t.data ? ` — ${t.data}` : "";
  return `- [ ] ${t.zadanie}${osoba}${data}`;
}

export function reportToMarkdown(report: Report): string {
  const tasks = report.tasks.map(taskToLine);
  return vaultDocument(
    "report",
    report.id,
    undefined,
    { topic: report.topic, date: report.date, participants: report.participants },
    `## Porządek
${bulletList(report.agenda)}

## Zadania
${tasks.join("\n")}

## Notatki
${report.notes}
`,
    ["protokol"]
  );
}

/** Zadania odzyskują app_task_id z dotychczasowego protokołu (dopasowanie po treści i osobie). */
export function reportFromMarkdown(text: string, previous?: Pick<Report, "tasks">): Partial<Report> {
  const { data, body: rawBody } = parseFrontMatter(text);
  const body = restoreLinks(data, rawBody);
  const s = sections(body);
  const tasks: ReportTask[] = (s["zadania"] ?? "")
    .split("\n")
    .map((l) => parseTaskLine(l.trim()))
    .filter((t): t is ReportTask => t !== null)
    .map((task) => {
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
