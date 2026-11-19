// lib/obsidianTasks.ts
//
// Zadania z Obsidiana (format wtyczki Tasks) → wiersze tabeli tasks, oraz plan dnia → Markdown dla notatki dziennej.
// Czyste funkcje (bez bazy): parsowanie linii „- [ ] Tytuł 📅 2026-11-20 ⏫ #kategoria” i budowa listy zadań.

import type { Task } from "@/types/tasks";
import type { Event } from "@/types/events";

const MAX_OBSIDIAN_TASKS_PER_SUBMIT = 30;
const MAX_OBSIDIAN_TASK_TITLE = 200;
const DEFAULT_TASK_PRIORITY = 3;

/** Priorytety wtyczki Tasks → skala aplikacji 1 (najwyższy) … 5 (najniższy). */
const PRIORITY_EMOJI: Record<string, number> = { "🔺": 1, "⏫": 2, "🔼": 3, "🔽": 4, "⏬": 5 };
const PRIORITY_TO_EMOJI: Record<number, string> = { 1: "🔺", 2: "⏫", 4: "🔽", 5: "⏬" };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CHECKBOX = /^\s*[-*+]\s+\[( |x|X)\]\s+/;
const DUE = /📅\s*(\d{4}-\d{2}-\d{2})/u;
const TAG = /(?:^|\s)#([\p{L}\p{N}_/-]+)/u;
// Pozostałe znaczniki Tasks (start, zaplanowane, utworzone, ukończone, powtarzanie) usuwamy z tytułu.
const OTHER_MARKERS = /(?:[🛫⏳➕✅❌]\s*\d{4}-\d{2}-\d{2}|🔁[^📅🛫⏳➕✅❌🔺⏫🔼🔽⏬]*)/gu;

export interface ObsidianTaskDraft {
  title: string;
  due_date: string;
  priority: number;
  category: string | null;
}

/** RRRR-MM-DD istniejącej daty (Date.parse przyjmuje też „2026-02-31”, więc sprawdzamy powrót do tej samej daty). */
const validDate = (v: string): boolean => {
  if (!ISO_DATE.test(v)) return false;
  const t = Date.parse(`${v}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === v;
};

/** Jedna linia Markdown → zadanie; null dla linii pustej, ukończonej albo bez tytułu. */
export function parseTaskLine(line: string, today: string): ObsidianTaskDraft | null {
  const box = CHECKBOX.exec(line);
  if (box && box[1].toLowerCase() === "x") return null;
  let rest = box ? line.slice(box[0].length) : line.replace(/^\s*[-*+]\s+/, "");

  const due = DUE.exec(rest)?.[1];
  const priority = Object.entries(PRIORITY_EMOJI).find(([emoji]) => rest.includes(emoji))?.[1];
  const category = TAG.exec(rest)?.[1] ?? null;

  rest = rest
    .replace(DUE, "")
    .replace(OTHER_MARKERS, "")
    .replace(/[🔺⏫🔼🔽⏬]/gu, "")
    .replace(/(?:^|\s)#[\p{L}\p{N}_/-]+/gu, " ")
    .replaceAll(/\s+/g, " ")
    .trim()
    .slice(0, MAX_OBSIDIAN_TASK_TITLE);
  if (!rest) return null;

  return {
    title: rest,
    due_date: due && validDate(due) ? due : today,
    priority: priority ?? DEFAULT_TASK_PRIORITY,
    category,
  };
}

/** Treść żądania: { text: "linie Markdown" } albo { tasks: ["linia", …] }. */
export function readObsidianTasks(body: unknown, today: string): ObsidianTaskDraft[] | { error: string } {
  const b = (body ?? {}) as { text?: unknown; tasks?: unknown };
  let lines: string[];
  if (typeof b.text === "string") lines = b.text.split(/\r?\n/);
  else if (Array.isArray(b.tasks) && b.tasks.every((t) => typeof t === "string")) lines = b.tasks as string[];
  else return { error: "Brak pola „text” albo „tasks”." };

  const drafts = lines.map((l) => parseTaskLine(l, today)).filter((d): d is ObsidianTaskDraft => d !== null);
  if (drafts.length === 0) return { error: "Brak zadań do dodania." };
  if (drafts.length > MAX_OBSIDIAN_TASKS_PER_SUBMIT) return { error: "Za dużo zadań w jednym żądaniu." };
  return drafts;
}

/** Zadanie aplikacji → linia wtyczki Tasks (bez identyfikatora – plan dnia jest tylko do odczytu). */
export function taskToLine(task: Pick<Task, "title" | "due_date" | "priority" | "status" | "category">): string {
  const done = task.status === "done" ? "x" : " ";
  const parts = [`- [${done}] ${task.title.replaceAll(/\s+/g, " ").trim()}`];
  const emoji = PRIORITY_TO_EMOJI[task.priority];
  if (emoji) parts.push(emoji);
  if (task.due_date) parts.push(`📅 ${task.due_date}`);
  if (task.category) parts.push(`#${task.category.replaceAll(/[^\p{L}\p{N}_/-]/gu, "")}`);
  return parts.join(" ");
}

const hhmm = (iso: string): string => {
  const m = /T(\d{2}:\d{2})/.exec(iso);
  return m ? m[1] : "";
};

/** Plan dnia dla notatki dziennej: wydarzenia (godzina – tytuł) i zadania na dany dzień. */
export function dayPlanMarkdown(
  date: string,
  events: ReadonlyArray<Pick<Event, "title" | "start_time" | "end_time" | "place">>,
  tasks: ReadonlyArray<Pick<Task, "title" | "due_date" | "priority" | "status" | "category">>
): string {
  const ev = [...events]
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .map((e) => `- ${hhmm(e.start_time)}–${hhmm(e.end_time)} ${e.title}${e.place ? ` (${e.place})` : ""}`);
  const ts = [...tasks].sort((a, b) => a.priority - b.priority).map(taskToLine);
  return [
    `## Kalendarz (${date})`,
    ...(ev.length ? ev : ["- brak wydarzeń"]),
    "",
    "## Zadania z dzisiaj.fun",
    ...(ts.length ? ts : ["- brak zadań"]),
    "",
  ].join("\n");
}
