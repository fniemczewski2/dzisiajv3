// __tests__/lib/offlineQueue.test.ts
//
// Kolejka zapisów offline: wysyłane są tylko wpisy zalogowanej osoby,
// w kolejności dodania; wpis odrzucany przez bazę znika po 3 próbach.

import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clearQueue, enqueueInsert, flushQueue } from "@/lib/offlineQueue";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

function client(fail = false) {
  const inserted: { table: string; row: Record<string, unknown> }[] = [];
  const supabase = {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        inserted.push({ table, row });
        return Promise.resolve({ error: fail ? { message: "RLS" } : null });
      },
    }),
  } as unknown as SupabaseClient;
  return { supabase, inserted };
}

beforeEach(async () => {
  await clearQueue();
});

describe("offlineQueue", () => {
  it("wysyła tylko zapisy właściciela, w kolejności dodania, z jego user_id", async () => {
    await enqueueInsert(A, "tasks", { title: "pierwsze" });
    await enqueueInsert(B, "tasks", { title: "cudze" });
    await enqueueInsert(A, "tasks", { title: "drugie", user_id: B });
    const { supabase, inserted } = client();

    const result = await flushQueue(supabase, A);

    expect(result).toEqual({ sent: 2, pending: 0, dropped: 0 });
    expect(inserted.map((i) => i.row.title)).toEqual(["pierwsze", "drugie"]);
    expect(inserted.every((i) => i.row.user_id === A)).toBe(true);
    // Wpis osoby B został w kolejce.
    expect((await flushQueue(client().supabase, B)).sent).toBe(1);
  });

  it("wpis odrzucany przez bazę jest usuwany po trzech próbach", async () => {
    await enqueueInsert(A, "tasks", { title: "zły" });
    const { supabase } = client(true);
    expect(await flushQueue(supabase, A)).toEqual({ sent: 0, pending: 1, dropped: 0 });
    expect(await flushQueue(supabase, A)).toEqual({ sent: 0, pending: 1, dropped: 0 });
    expect(await flushQueue(supabase, A)).toEqual({ sent: 0, pending: 0, dropped: 1 });
    expect(await flushQueue(supabase, A)).toEqual({ sent: 0, pending: 0, dropped: 0 });
  });

  it("clearQueue usuwa wszystkie wpisy (wylogowanie)", async () => {
    await enqueueInsert(A, "tasks", { title: "x" });
    await clearQueue();
    expect((await flushQueue(client().supabase, A)).sent).toBe(0);
  });
});
