// __tests__/lib/server/vaultRepo.test.ts
//
// Repozytorium danych vaultu: zapisy i aktualizacje zawsze w zakresie zalogowanego użytkownika.

import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseVaultRepo } from "@/lib/server/vaultConnection";

vi.mock("@/config/env", () => ({ publicEnv: { appUrl: "https://x" }, serverEnv: {} }));

interface Call {
  table: string;
  op: string;
  payload?: unknown;
  filters: string[];
  columns?: string;
}

function fakeSupabase(result: { data?: unknown; error?: unknown } = { data: { id: "new-1" }, error: null }) {
  const calls: Call[] = [];
  const client = {
    from: (table: string) => {
      const call: Call = { table, op: "", filters: [] };
      calls.push(call);
      const b: Record<string, unknown> = {
        insert: (payload: unknown) => ((call.op = "insert"), (call.payload = payload), b),
        update: (payload: unknown) => ((call.op = "update"), (call.payload = payload), b),
        select: (columns: string) => ((call.columns = columns), b),
        eq: (column: string, value: unknown) => (call.filters.push(`${column}=${String(value)}`), b),
        single: async () => result,
        then: (resolve: (v: unknown) => unknown) => resolve({ error: (result as { error?: unknown }).error ?? null }),
      };
      return b;
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

describe("supabaseVaultRepo", () => {
  it("insertItem: właściwa tabela dla typu, user_id ustawiany przez serwer (nie z pliku), jawne kolumny", async () => {
    const { client, calls } = fakeSupabase({ data: { id: "r1", name: "Placki" }, error: null });
    const repo = supabaseVaultRepo(client, "u1");
    const row = await repo.insertItem("recipe", { name: "Placki", category: "deser", user_id: "podszyty" });
    expect(row).toEqual({ id: "r1", name: "Placki" });
    expect(calls[0]).toMatchObject({ table: "recipes", op: "insert" });
    expect(calls[0].payload).toMatchObject({ name: "Placki", user_id: "u1" });
    expect(calls[0].columns).not.toBe("*");
    expect(calls[0].columns).toContain("category");
  });

  it.each([
    ["person", "people"],
    ["report", "reports"],
  ] as const)("insertItem(%s) → tabela %s", async (type, table) => {
    const { client, calls } = fakeSupabase();
    await supabaseVaultRepo(client, "u1").insertItem(type, {});
    expect(calls[0].table).toBe(table);
  });

  it("insertItem: błąd bazy lub brak wiersza → wyjątek", async () => {
    await expect(
      supabaseVaultRepo(fakeSupabase({ data: null, error: { message: "x" } }).client, "u1").insertItem("person", {})
    ).rejects.toBeDefined();
    await expect(
      supabaseVaultRepo(fakeSupabase({ data: null, error: null }).client, "u1").insertItem("person", {})
    ).rejects.toThrow();
  });

  it("insertNote: wartości domyślne notatki, user_id z sesji, notatka nie jest przypięta ani zarchiwizowana", async () => {
    const { client, calls } = fakeSupabase({ data: { id: "n1" }, error: null });
    await supabaseVaultRepo(client, "u1").insertNote({ title: "T", items: ["a"], folder: "Dom" });
    expect(calls[0].payload).toMatchObject({
      title: "T",
      folder: "Dom",
      user_id: "u1",
      pinned: false,
      archived: false,
    });
  });

  it("updateItem: filtruje po id ORAZ user_id (cudzy wiersz nie może zostać zmieniony)", async () => {
    const { client, calls } = fakeSupabase();
    await supabaseVaultRepo(client, "u1").updateItem("note", "n9", { title: "Nowy" });
    expect(calls[0]).toMatchObject({ table: "notes", op: "update" });
    expect(calls[0].filters).toEqual(["id=n9", "user_id=u1"]);
  });
});
