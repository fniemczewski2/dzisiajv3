// supabase/functions/process-notifications/batch_test.ts – deno test

import type { SupabaseClient } from "../_shared/supabase.ts";
import { rowsByUser, usersNotifiedToday } from "./batch.ts";

// Bez zależności od jsr/deno.land – tak samo jak pozostałe testy Deno w repozytorium.
function assertEquals(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`oczekiwano ${JSON.stringify(expected)}, jest ${JSON.stringify(actual)}`);
  }
}

type Call = { table: string; ids: string[]; filters: string[] };

function fakeClient(rows: Record<string, { user_id: string }[]>, calls: Call[]): SupabaseClient {
  const builder = (table: string) => {
    const call: Call = { table, ids: [], filters: [] };
    const q = {
      select: () => q,
      in: (_c: string, ids: string[]) => {
        call.ids = ids;
        return q;
      },
      eq: (c: string, v: unknown) => (call.filters.push(`eq:${c}=${v}`), q),
      neq: (c: string, v: unknown) => (call.filters.push(`neq:${c}=${v}`), q),
      gte: (c: string, v: unknown) => (call.filters.push(`gte:${c}=${v}`), q),
      lt: (c: string, v: unknown) => (call.filters.push(`lt:${c}=${v}`), q),
      contains: (c: string, v: unknown) => (call.filters.push(`contains:${c}=${JSON.stringify(v)}`), q),
      then: (resolve: (r: unknown) => void) => {
        calls.push(call);
        resolve({ data: (rows[table] ?? []).filter((r) => call.ids.includes(r.user_id)), error: null });
      },
    };
    return q;
  };
  return { from: builder } as unknown as SupabaseClient;
}

Deno.test("rowsByUser grupuje wiersze i dzieli listę id na porcje", async () => {
  const ids = Array.from({ length: 450 }, (_, i) => `u${i}`);
  const calls: Call[] = [];
  const client = fakeClient({ tasks: [{ user_id: "u1" }, { user_id: "u1" }, { user_id: "u300" }] }, calls);
  const grouped = await rowsByUser(client, "tasks", "user_id", ids, { eq: { due_date: "2026-10-18" } });
  assertEquals(grouped.get("u1")?.length, 2);
  assertEquals(grouped.get("u300")?.length, 1);
  assertEquals(calls.length, 3);
  assertEquals(calls[0].filters, ["eq:due_date=2026-10-18"]);
});

Deno.test("usersNotifiedToday filtruje po typie, dniu i opcjonalnym slocie", async () => {
  const calls: Call[] = [];
  const client = fakeClient({ notifications: [{ user_id: "a" }] }, calls);
  const notified = await usersNotifiedToday(client, "hydration", "2026-10-17T22:00:00Z", ["a", "b"], 14);
  assertEquals([...notified], ["a"]);
  assertEquals(calls[0].filters, [
    "eq:type=hydration",
    "gte:created_at=2026-10-17T22:00:00Z",
    'contains:data={"slot":14}',
  ]);
});
