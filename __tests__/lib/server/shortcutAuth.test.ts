// __tests__/lib/server/shortcutAuth.test.ts

import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveShortcutUser } from "@/lib/server/shortcutAuth";
import { hashShortcutToken } from "@/lib/server/shortcutTokens";

function admin(result: { data: unknown; error: unknown }) {
  const eqCalls: unknown[][] = [];
  const client = {
    from: () => ({
      select: () => ({
        eq: (...args: unknown[]) => {
          eqCalls.push(args);
          return { maybeSingle: async () => result };
        },
      }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  } as unknown as SupabaseClient;
  return { client, eqCalls };
}

describe("resolveShortcutUser", () => {
  it("szuka po skrócie SHA-256 tokenu i zwraca użytkownika", async () => {
    const { client, eqCalls } = admin({ data: { user_id: "u1" }, error: null });
    expect(await resolveShortcutUser(client, "dzs_abc")).toBe("u1");
    expect(eqCalls[0]).toEqual(["token_hash", hashShortcutToken("dzs_abc")]);
  });

  it("nieznany token: null (odpowiedź 401)", async () => {
    const { client } = admin({ data: null, error: null });
    expect(await resolveShortcutUser(client, "dzs_abc")).toBeNull();
  });

  it("błąd bazy: wyjątek zamiast null – nie jest maskowany jako zły token", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = admin({ data: null, error: { message: "Invalid API key" } });
    await expect(resolveShortcutUser(client, "dzs_abc")).rejects.toThrow("Nie udało się sprawdzić tokenu skrótów.");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("shortcut_tokens"), "Invalid API key");
    spy.mockRestore();
  });
});
