// __tests__/pages/api/worklogsAuto.test.ts
//
// Skróty iOS: rozpoczęcie i zakończenie czasu pracy tokenem skrótów.

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
vi.mock("@/lib/dateUtils", () => ({ getAppDateTime: () => "2026-11-02T08:00:00" }));
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

import handler from "@/pages/api/worklogs/auto";

function call(body: unknown, method = "POST", token = "dobry") {
  const req = { method, body, headers: { authorization: token } } as unknown as NextApiRequest;
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

describe("POST /api/worklogs/auto", () => {
  it("metoda, token, akcja i nieznany użytkownik: 405 / 401 / 400 / 401 bez zapytań o wpisy", async () => {
    for (const [body, method, token, status] of [
      [{ action: "start" }, "GET", "dobry", 405],
      [{ action: "start" }, "POST", "zły", 401],
      [{ action: "pauza" }, "POST", "dobry", 400],
    ] as const) {
      const { req, res } = call(body, method, token);
      await handler(req, res);
      expect(res.statusCode).toBe(status);
    }
    h.userId = null;
    const { req, res } = call({ action: "start" });
    await handler(req, res);
    expect(res.statusCode).toBe(401);
    expect(h.calls).toHaveLength(0);
  });

  it("start przy otwartym wpisie: 400 i brak drugiego wpisu", async () => {
    h.results = [{ data: [{ id: "w1" }], error: null }];
    const { req, res } = call({ action: "start" });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(h.calls).toHaveLength(1);
  });

  it("start: wpis z czasem aplikacji, przypisany do użytkownika z tokenu", async () => {
    h.results = [
      { data: [], error: null },
      { data: { id: "w2" }, error: null },
    ];
    const { req, res } = call({ action: "start" });
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    const insert = h.calls[1].chain.find((c) => c[0] === "insert");
    expect(insert?.[1]).toEqual([
      { user_id: "u1", description: "Wpis automatyczny", start_time: "2026-11-02T08:00:00" },
    ]);
  });

  it("koniec bez otwartego wpisu: 404", async () => {
    h.results = [{ data: null, error: null }];
    const { req, res } = call({ action: "end" });
    await handler(req, res);
    expect(res.statusCode).toBe(404);
  });

  it("koniec: aktualizacja tylko wpisu użytkownika z tokenu", async () => {
    h.results = [
      { data: { id: "w1" }, error: null },
      { data: { id: "w1" }, error: null },
    ];
    const { req, res } = call({ action: "end" });
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    const chain = h.calls[1].chain;
    expect(chain).toContainEqual(["update", { end_time: "2026-11-02T08:00:00" }]);
    expect(chain).toContainEqual(["eq", "id", "w1"]);
    expect(chain).toContainEqual(["eq", "user_id", "u1"]);
  });

  it("błąd bazy: 500 bez szczegółów błędu w odpowiedzi", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.results = [{ data: null, error: { message: "relation does not exist" } }];
    const { req, res } = call({ action: "start" });
    await handler(req, res);
    expect(res.statusCode).toBe(500);
    expect(JSON.stringify(res.payload)).not.toContain("relation");
    spy.mockRestore();
  });
});
