// supabase/functions/process-notifications/batch_test.ts – deno test

import type { SupabaseClient } from "../_shared/supabase.ts";
import { rowsByUser, sentDataKeys, sentKey, usersNotifiedToday } from "./batch.ts";

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
    const filter = (op: string) => (c: string, v: unknown) => {
      call.filters.push(`${op}:${c}=${typeof v === "string" ? v : JSON.stringify(v)}`);
      return q;
    };
    // Prawdziwa obietnica (bez własnego `then`): wynik powstaje po zapisaniu filtrów w łańcuchu.
    const result = Promise.resolve().then(() => {
      calls.push(call);
      return { data: (rows[table] ?? []).filter((r) => call.ids.includes(r.user_id)), error: null };
    });
    const q = Object.assign(result, {
      select: () => q,
      in: (_c: string, ids: string[]) => {
        call.ids = ids;
        return q;
      },
      eq: filter("eq"),
      neq: filter("neq"),
      gte: filter("gte"),
      lt: filter("lt"),
      contains: filter("contains"),
    });
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

Deno.test("sentDataKeys: jedno zapytanie na porcję, klucze użytkownik|wartość, filtr daty opcjonalny", async () => {
  const calls: string[][] = [];
  const rows = [
    { user_id: "u1", data: { letter_id: "L1" } },
    { user_id: "u2", data: { letter_id: "L2" } },
    { user_id: "u3", data: { letter_id: "L3" } },
  ];
  const client = {
    from: () => {
      const filters: string[] = [];
      let ids: string[] = [];
      const q = {
        select: () => q,
        eq: (c: string, v: unknown) => {
          filters.push(`eq:${c}=${v}`);
          return q;
        },
        gte: (c: string, v: unknown) => {
          filters.push(`gte:${c}=${v}`);
          return q;
        },
        in: (_c: string, v: string[]) => {
          ids = v;
          return q;
        },
        // NOSONAR: konstruktor zapytań PostgREST jest thenable, a test odwzorowuje to zachowanie.
        then: (resolve: (r: unknown) => unknown) => {
          calls.push(filters);
          return Promise.resolve({ data: rows.filter((r) => ids.includes(r.user_id)), error: null }).then(resolve);
        },
      };
      return q;
    },
  } as unknown as SupabaseClient;

  const withDate = await sentDataKeys(
    client,
    "letters_deadline",
    ["u1", "u2", "u1"],
    "letter_id",
    "2026-10-29T00:00:00Z"
  );
  assertEquals(
    [...withDate].sort((a, b) => a.localeCompare(b)),
    ["u1|L1", "u2|L2"]
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].includes("gte:created_at=2026-10-29T00:00:00Z"), true);

  await sentDataKeys(client, "poll_closing", ["u3"], "letter_id");
  assertEquals(
    calls[1].some((f) => f.startsWith("gte:")),
    false
  );
  assertEquals(sentKey("u1", "L1"), "u1|L1");
});
