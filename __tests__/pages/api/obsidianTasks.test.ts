// __tests__/pages/api/obsidianTasks.test.ts
//
// Obsidian: plan dnia (GET) i dodawanie zadań (POST) tokenem skrótów.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

type Result = { data: unknown; error: unknown };

const h = vi.hoisted(() => ({
  userId: "u1" as string | null,
  /** Wyniki kolejnych zapytań (po jednym na wywołanie from()). */
  results: [] as Result[],
  calls: [] as { table: string; chain: unknown[][] }[],
}));

vi.mock("@/lib/server/rateLimit", () => ({ enforceRateLimit: async () => true, clientIp: () => "1.1.1.1" }));
vi.mock("@/lib/server/shortcutTokens", () => ({ looksLikeShortcutToken: (t: unknown) => t === "dobry" }));
vi.mock("@/lib/server/shortcutAuth", () => ({
  extractShortcutToken: (req: { headers: Record<string, string> }) => req.headers.authorization ?? null,
  resolveShortcutUser: async () => h.userId,
}));
vi.mock("@/lib/dateUtils", () => ({ getAppDate: () => "2026-11-19" }));
vi.mock("@/lib/server/supabaseAdmin", () => ({
  supabaseAdmin: () => ({
    from: (table: string) => {
      const chain: unknown[][] = [];
      h.calls.push({ table, chain });
      const result = h.results.shift() ?? { data: null, error: null };
      const builder: Record<string, unknown> = new Proxy(
        {},
        {
          get(_t, prop: string) {
            if (prop === "then") return (ok: (r: Result) => unknown) => Promise.resolve(result).then(ok);
            if (prop === "maybeSingle") return () => Promise.resolve(result);
            return (...args: unknown[]) => {
              chain.push([prop, ...args]);
              return builder;
            };
          },
        }
      );
      return builder;
    },
  }),
}));

import handler from "@/pages/api/obsidian/tasks";

function call(body: unknown, method = "POST", token = "dobry", query: Record<string, string> = {}) {
  const req = { method, body, query, headers: { authorization: token } } as unknown as NextApiRequest;
  const res = {
    statusCode: 200,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(p: unknown) {
      this.payload = p;
      return this;
    },
    setHeader: vi.fn(),
  };
  return { req, res: res as unknown as NextApiResponse & { statusCode: number; payload: { error?: string } } };
}

beforeEach(() => {
  h.userId = "u1";
  h.results = [];
  h.calls = [];
});

const U = "11111111-1111-4111-8111-111111111111";

describe("/api/obsidian/tasks", () => {
  it("metoda, token i nieznany użytkownik: 405 / 401 / 401 bez zapytań o dane", async () => {
    for (const [method, token, status] of [
      ["DELETE", "dobry", 405],
      ["POST", "zły", 401],
    ] as const) {
      const { req, res } = call({ text: "- [ ] A" }, method, token);
      await handler(req, res);
      expect(res.statusCode).toBe(status);
    }
    h.userId = null;
    const { req, res } = call({ text: "- [ ] A" });
    await handler(req, res);
    expect(res.statusCode).toBe(401);
    expect(h.calls).toHaveLength(0);
  });

  it("POST dodaje zadania użytkownika z tokenu", async () => {
    h.userId = U;
    const { req, res } = call({ text: "- [ ] Raport 📅 2026-11-25 ⏫ #UWr\n- [x] Gotowe\n- [ ] Telefon" });
    await handler(req, res);
    expect(res.statusCode).toBe(201);
    const insert = h.calls[0].chain.find((c) => c[0] === "insert")?.[1] as Array<Record<string, unknown>>;
    expect(insert).toEqual([
      { user_id: U, title: "Raport", due_date: "2026-11-25", priority: 2, category: "UWr", status: "pending" },
      { user_id: U, title: "Telefon", due_date: "2026-11-19", priority: 3, category: null, status: "pending" },
    ]);
  });

  it("POST bez zadań – 400 bez zapisu", async () => {
    h.userId = U;
    const { req, res } = call({ text: "- [x] A" });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(h.calls).toHaveLength(0);
  });

  it("GET zwraca plan dnia bez wydarzeń cyklicznych", async () => {
    h.userId = U;
    h.results = [
      {
        data: [{ title: "Raport", due_date: "2026-11-19", priority: 2, status: "pending", category: null }],
        error: null,
      },
      {
        data: [
          {
            title: "Zarząd",
            start_time: "2026-11-19T18:00:00+00",
            end_time: "2026-11-19T19:00:00+00",
            place: null,
            repeat: "none",
          },
          {
            title: "Joga",
            start_time: "2026-11-19T07:00:00+00",
            end_time: "2026-11-19T08:00:00+00",
            place: null,
            repeat: "weekly",
          },
        ],
        error: null,
      },
    ];
    const { req, res } = call(undefined, "GET");
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    const p = res.payload as unknown as { markdown: string; events: unknown[] };
    expect(p.events).toHaveLength(1);
    expect(p.markdown).toContain("- 18:00–19:00 Zarząd");
    expect(p.markdown).toContain("- [ ] Raport ⏫ 📅 2026-11-19");
  });

  it("GET z nieprawidłową datą – 400", async () => {
    const { req, res } = call(undefined, "GET", "dobry", { date: "jutro" });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });
});
