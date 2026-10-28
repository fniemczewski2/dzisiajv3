// lib/mail/tasks.ts
//
// Zadanie utworzone z wiadomości: tytuł „Odpowiedz: <temat>”, kategoria „poczta”.

import { MAX_TITLE_LENGTH } from "@/config/limits";
import { MAIL_TASK_CATEGORY } from "@/config/tasks";

export { MAIL_TASK_CATEGORY };

const PREFIX_RE = /^\s*((re|odp|fw|fwd|wg)\s*:\s*)+/i;

/** Usuwa prefiksy odpowiedzi/przekazania z tematu i zwraca tytuł zadania. */
export function replyTaskTitle(subject: string): string {
  const clean = subject.replace(PREFIX_RE, "").replace(/\s+/g, " ").trim() || "(bez tematu)";
  return `Odpowiedz: ${clean}`.slice(0, MAX_TITLE_LENGTH);
}
