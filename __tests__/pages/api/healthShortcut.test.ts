// __tests__/pages/api/healthShortcut.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

const h = vi.hoisted(() => ({
  userId: "u1" as string | null,
  settings: { health_consent_at: "2026-10-30T10:00:00Z", health_consent_version: "2026-10-30" } as Record<
    string,
    unknown
  > | null,
  upserts: [] as { table: string; row: unknown }[],
}));

vi.mock("@/lib/server/rateLimit", () => ({ enforceRateLimit: async () => true, clientIp: () => "1.1.1.1" }));
vi.mock("@/lib/server/shortcutTokens", () => ({ looksLikeShortcutToken: (t: unknown) => t === "dobry-token" }));
vi.mock("@/lib/server/shortcutAuth", () => ({
  extractShortcutToken: (req: { headers: Record<string, string> }) => req.headers.authorization ?? null,
  resolveShortcutUser: async () => h.userId,
}));
vi.mock("@/lib/server/supabaseAdmin", () => ({
  supabaseAdmin: () => ({
    from: (table: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: h.settings }) }) }),
      upsert: async (row: unknown) => {
        h.upserts.push({ table, row });
        return { error: null };
      },
    }),
  }),
}));

import handler from "@/pages/api/health/shortcut";

function call(body: unknown, token = "dobry-token") {
  const req = { method: "POST", body, headers: { authorization: token } } as unknown as NextApiRequest;
  const res = {
    statusCode: 200,
    payload: undefined as unknown,
    setHeader: vi.fn(),
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(p: unknown) {
      this.payload = p;
      return this;
    },
  };
  return { req, res: res as unknown as NextApiResponse & { statusCode: number } };
}

beforeEach(() => {
  h.userId = "u1";
  h.settings = { health_consent_at: "2026-10-30T10:00:00Z", health_consent_version: "2026-10-30" };
  h.upserts = [];
});

describe("POST /api/health/shortcut", () => {
  it("z aktualną zgodą zapisuje dzień (częściowo) i treningi", async () => {
    const { req, res } = call({
      date: "2026-10-30",
      steps: 9000,
      workouts: [{ type: "Spacer", start: "2026-10-30T12:00:00Z" }],
    });
    await handler(req, res);
    expect(res.statusCode).toBe(201);
    expect(h.upserts.map((u) => u.table)).toEqual(["health_daily", "health_workouts"]);
    expect(h.upserts[0].row).toMatchObject({ user_id: "u1", date: "2026-10-30", steps: 9000 });
    expect(h.upserts[0].row).not.toHaveProperty("sleep_minutes");
  });

  it("bez zgody albo przy nieaktualnej wersji zgody: 403 i nic nie jest zapisywane", async () => {
    h.settings = { health_consent_at: null, health_consent_version: null };
    const a = call({ date: "2026-10-30", steps: 1 });
    await handler(a.req, a.res);
    expect(a.res.statusCode).toBe(403);
    h.settings = { health_consent_at: "2026-01-01T00:00:00Z", health_consent_version: "stara" };
    const b = call({ date: "2026-10-30", steps: 1 });
    await handler(b.req, b.res);
    expect(b.res.statusCode).toBe(403);
    expect(h.upserts).toHaveLength(0);
  });

  it("zły token: 401; złe dane: 400", async () => {
    const a = call({ date: "2026-10-30", steps: 1 }, "zły");
    await handler(a.req, a.res);
    expect(a.res.statusCode).toBe(401);
    const b = call({ date: "jutro" });
    await handler(b.req, b.res);
    expect(b.res.statusCode).toBe(400);
    expect(h.upserts).toHaveLength(0);
  });
});
