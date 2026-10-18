// __tests__/lib/server/accountData.test.ts

import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AccountDataError, deleteUserData } from "@/lib/server/accountData";
import { USER_TABLES } from "@/config/userData";

type Call = { op: string; table: string; column?: string };

function fakeAdmin(failOn?: string) {
  const calls: Call[] = [];
  const pollRows: Record<string, { id: string }[]> = {
    "meeting_polls:user_id": [{ id: "poll-1" }],
    "meeting_poll_responses:poll_id": [{ id: "resp-1" }],
    "meeting_poll_responses:user_id": [{ id: "resp-own" }],
  };
  const admin = {
    from(table: string) {
      return {
        update: () => ({
          eq: (column: string) => {
            calls.push({ op: "update", table, column });
            return Promise.resolve({ error: null });
          },
        }),
        select: () => ({
          in: (column: string) => ({
            range: () => Promise.resolve({ data: pollRows[`${table}:${column}`] ?? [], error: null }),
          }),
        }),
        delete: () => ({
          in: (column: string) => ({
            select: () => {
              calls.push({ op: "delete", table, column });
              if (table === failOn) return Promise.resolve({ data: null, error: { code: "23503", message: "fk" } });
              return Promise.resolve({ data: [], error: null });
            },
          }),
        }),
      };
    },
    storage: {
      from: () => ({
        list: () => Promise.resolve({ data: [], error: null }),
        remove: () => Promise.resolve({ error: null }),
      }),
    },
  } as unknown as SupabaseClient;
  return { admin, calls };
}

describe("deleteUserData", () => {
  it("usuwa każdą tabelę z rejestru, ankiety i odpowiedzi tej osoby w cudzych ankietach", async () => {
    const { admin, calls } = fakeAdmin();
    await deleteUserData(admin, "user-1");
    const deleted = new Set(calls.filter((c) => c.op === "delete").map((c) => c.table));
    const missing = USER_TABLES.map((entry) => entry.table).filter((table) => !deleted.has(table));
    expect(missing).toEqual([]);
    const polls = ["meeting_polls", "meeting_poll_dates", "meeting_poll_responses", "meeting_poll_availabilities"];
    expect(polls.filter((table) => !deleted.has(table))).toEqual([]);
  });

  it("najpierw zeruje udostępnienia, potem usuwa dzieci przed rodzicami", async () => {
    const { admin, calls } = fakeAdmin();
    await deleteUserData(admin, "user-1");
    const order = calls.map((c) => `${c.op}:${c.table}`);
    const at = (key: string) => order.indexOf(key);
    expect(at("update:tasks")).toBeLessThan(at("delete:tasks"));
    expect(at("delete:task_reminders")).toBeLessThan(at("delete:tasks"));
    expect(at("delete:tasks")).toBeLessThan(at("delete:recurring_bills"));
    expect(at("delete:transactions")).toBeLessThan(at("delete:budget_categories"));
    expect(at("delete:meeting_poll_availabilities")).toBeLessThan(at("delete:meeting_poll_responses"));
    expect(at("delete:settings")).toBeLessThan(at("delete:users"));
  });

  it("przerywa przy błędzie i nie kontynuuje kolejnych etapów", async () => {
    const { admin, calls } = fakeAdmin("tasks");
    await expect(deleteUserData(admin, "user-1")).rejects.toBeInstanceOf(AccountDataError);
    expect(calls.some((c) => c.op === "delete" && c.table === "users")).toBe(false);
  });
});
