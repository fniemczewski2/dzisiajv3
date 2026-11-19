// lib/mentionTargets.ts
//
// Rozwiązanie powiązania (@Osoba, !Zadanie, $Rachunek) na identyfikator wpisu i stronę modułu. Dopasowanie:
// najpierw dokładna nazwa (bez wielkości liter), potem nazwa zaczynająca się od tekstu; zadania niezakończone
// mają pierwszeństwo. Strona docelowa otwiera wpis z parametru `?focus=<id>` (hooks/useFocusTarget.ts).

import type { SupabaseClient } from "@supabase/supabase-js";
import { escapeLikePattern } from "@/lib/postgrestFilters";
import type { MentionKind } from "@/lib/mentions";

export const MENTION_HREF: Readonly<Record<MentionKind, string>> = {
  person: "/people",
  task: "/tasks",
  bill: "/bills",
};

export const MENTION_LABEL: Readonly<Record<MentionKind, string>> = {
  person: "osobę",
  task: "zadanie",
  bill: "rachunek",
};

const norm = (value: string) => value.trim().toLocaleLowerCase("pl");

interface Candidate {
  id: string;
  label: string;
  done?: boolean;
}

/** Najlepsze dopasowanie nazwy: dokładne przed prefiksowym, niezakończone przed zakończonymi. */
export function pickCandidate(name: string, candidates: readonly Candidate[]): string | null {
  const wanted = norm(name);
  const score = (c: Candidate) => (norm(c.label) === wanted ? 0 : 2) + (c.done ? 1 : 0);
  const matching = candidates.filter((c) => norm(c.label).startsWith(wanted));
  matching.sort((a, b) => score(a) - score(b));
  return matching[0]?.id ?? null;
}

const LIMIT = 20;

async function candidatesFor(supabase: SupabaseClient, kind: MentionKind, name: string): Promise<Candidate[]> {
  const prefix = `${escapeLikePattern(name.trim())}%`;
  if (kind === "task") {
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, status")
      .ilike("title", prefix)
      .limit(LIMIT);
    if (error) throw error;
    return (data ?? []).map((t) => ({ id: String(t.id), label: String(t.title), done: t.status === "done" }));
  }
  if (kind === "bill") {
    const { data, error } = await supabase
      .from("recurring_bills")
      .select("id, name, active")
      .ilike("name", prefix)
      .limit(LIMIT);
    if (error) throw error;
    return (data ?? []).map((b) => ({ id: String(b.id), label: String(b.name), done: b.active === false }));
  }
  const first = name.trim().split(/\s+/)[0] ?? "";
  const { data, error } = await supabase
    .from("people")
    .select("id, first_name, last_name")
    .ilike("first_name", `${escapeLikePattern(first)}%`)
    .limit(LIMIT);
  if (error) throw error;
  return (data ?? []).map((p) => ({ id: String(p.id), label: `${p.first_name} ${p.last_name ?? ""}`.trim() }));
}

/** Identyfikator wpisu dla powiązania albo null (brak takiego wpisu). RLS ogranicza wynik do danych osoby. */
export async function resolveMention(
  supabase: SupabaseClient,
  kind: MentionKind,
  name: string
): Promise<string | null> {
  if (!name.trim()) return null;
  return pickCandidate(name, await candidatesFor(supabase, kind, name));
}
