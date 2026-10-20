// __tests__/lib/server/slackImport.test.ts
//
// Import ze Slacka na danych w formacie listy zadań Slacka (eksport „Zadania”):
// termin z wbudowanej kolumny „Due Date”, uzupełnianie pustych pól i domyślne
// wartości nowego zadania.

import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SlackColumn, SlackItem } from "@/lib/server/slackLists";
import {
  isWithinImportHorizon,
  missingFieldsFromItem,
  todayInPoland,
  withBuiltInColumns,
} from "@/lib/server/slackSync/taskMapping";
import { createTaskFromItem } from "@/lib/server/slackSync/pull";
import type { SyncTarget, TaskRow } from "@/lib/server/slackSync/types";

const columns: SlackColumn[] = [
  { id: "Col0BMUPKPFPA", key: "name", name: "Name", type: "text" },
  { id: "Col00", key: "todo_completed", name: "Completed", type: "todo_completed" },
  { id: "Col01", key: "todo_assignee", name: "Assignee", type: "todo_assignee" },
  { id: "Col02", key: "todo_due_date", name: "Due Date", type: "todo_due_date" },
];

const item: SlackItem = {
  id: "Rec0BNLCKPAUA",
  fields: [
    { key: "todo_due_date", value: "2026-09-17", date: ["2026-09-17"], column_id: "Col02" },
    { key: "name", value: "[]", text: "Grafiki do SoMe", column_id: "Col0BMUPKPFPA" },
    { key: "todo_completed", value: false, checkbox: false, column_id: "Col00" },
  ],
} as unknown as SlackItem;

const target = {
  userId: "00000000-0000-4000-8000-0000000000aa",
  listId: "F0BLYE1UULW",
  importCategory: "praca",
  columnMap: withBuiltInColumns({ title: "Col0BMUPKPFPA" }, columns),
} as unknown as SyncTarget;

describe("import zadań ze Slacka", () => {
  it("mapuje wbudowane kolumny „Due Date” i „Completed”, gdy nie ustawiono ich ręcznie", () => {
    expect(target.columnMap).toEqual({ title: "Col0BMUPKPFPA", due_date: "Col02", status: "Col00" });
    // Ręczne mapowanie ma pierwszeństwo.
    expect(withBuiltInColumns({ title: "x", due_date: "Inna" }, columns).due_date).toBe("Inna");
  });

  it("nowe zadanie ma termin, priorytet 3 i for_user_id = user_id", async () => {
    const inserted: Record<string, unknown>[] = [];
    const admin = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
        }),
        insert: (row: Record<string, unknown>) => {
          if (table === "tasks") inserted.push(row);
          // tasks: .insert().select().single(); slack_task_links: await .insert() → { error }.
          return Object.assign(Promise.resolve({ error: null }), {
            select: () => ({ single: () => Promise.resolve({ data: { id: 7 }, error: null }) }),
          });
        },
      }),
    } as unknown as SupabaseClient;
    const created = await createTaskFromItem(admin, target, item, columns);
    expect(created).toBe(true);
    expect(inserted[0]).toMatchObject({
      title: "Grafiki do SoMe",
      due_date: "2026-09-17",
      status: "pending",
      priority: 3,
      user_id: target.userId,
      for_user_id: target.userId,
    });
  });

  it("uzupełnia brakujący termin w już zaimportowanym zadaniu, nie nadpisując istniejących pól", () => {
    const task = { id: 1, title: "Inny tytuł", description: null, due_date: null, status: "pending" } as TaskRow;
    expect(missingFieldsFromItem(task, item, target.columnMap, columns)).toEqual({ due_date: "2026-09-17" });
    expect(missingFieldsFromItem({ ...task, due_date: "2026-10-01" }, item, target.columnMap, columns)).toEqual({});
  });

  it("importuje tylko pozycje z terminem od dziś do miesiąca naprzód", () => {
    const withDue = (due: string | null) =>
      ({
        id: "x",
        fields: due ? [{ key: "todo_due_date", value: due, date: [due], column_id: "Col02" }] : [],
      }) as unknown as SlackItem;
    const inHorizon = (due: string | null, today: string) =>
      isWithinImportHorizon(withDue(due), target.columnMap, columns, today);

    expect(inHorizon("2026-09-17", "2026-09-01")).toBe(true);
    expect(inHorizon("2026-10-01", "2026-09-01")).toBe(true); // granica włącznie
    expect(inHorizon("2026-10-02", "2026-09-01")).toBe(false);
    expect(inHorizon("2026-08-31", "2026-09-01")).toBe(false); // przeterminowane
    expect(inHorizon(null, "2026-09-01")).toBe(false); // bez terminu
    expect(inHorizon("2027-02-28", "2027-01-31")).toBe(true); // 31.01 + miesiąc = koniec lutego
    expect(inHorizon("2027-03-01", "2027-01-31")).toBe(false);
  });

  it("dzisiejsza data liczona w strefie Europe/Warsaw", () => {
    expect(todayInPoland(new Date("2026-10-19T22:30:00Z"))).toBe("2026-10-20");
  });

  it("ta sama pozycja zaimportowana równolegle: duplikat jest usuwany, bez błędu", async () => {
    const deleted: unknown[] = [];
    const admin = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
        }),
        insert: () =>
          Object.assign(
            Promise.resolve({ error: table === "slack_task_links" ? { code: "23505", message: "duplicate" } : null }),
            { select: () => ({ single: () => Promise.resolve({ data: { id: 9 }, error: null }) }) }
          ),
        delete: () => ({
          eq: (_c: string, id: unknown) => {
            deleted.push(id);
            return Promise.resolve({ error: null });
          },
        }),
      }),
    } as unknown as SupabaseClient;
    await expect(createTaskFromItem(admin, target, item, columns)).resolves.toBe(false);
    expect(deleted).toEqual([9]);
  });
});
