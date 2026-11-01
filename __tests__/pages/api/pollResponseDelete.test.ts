// __tests__/pages/api/pollResponseDelete.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

const POLL = "11111111-1111-4111-8111-111111111111";
const RESP = "22222222-2222-4222-8222-222222222222";

const h = vi.hoisted(() => ({
  owner: "u1",
  responseExists: true,
  deletes: [] as string[],
  filters: [] as string[],
}));

vi.mock("@/lib/server/apiGuards", () => ({
  allowMethods: (
    req: { method: string },
    res: { status: (c: number) => { json: (b: unknown) => void } },
    m: string[]
  ) => {
    if (m.includes(req.method)) return true;
    res.status(405).json({});
    return false;
  },
  requireUser: async () => ({
    user: { id: "u1" },
    supabase: {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: POLL, user_id: h.owner } }) }) }),
      }),
    },
  }),
}));

vi.mock("@/lib/server/supabaseAdmin", () => ({
  supabaseAdmin: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: (c1: string, v1: string) => ({
          eq: (c2: string, v2: string) => {
            h.filters.push(`${table}:${c1}=${v1},${c2}=${v2}`);
            return { maybeSingle: async () => ({ data: h.responseExists ? { id: RESP } : null }) };
          },
        }),
      }),
      delete: () => {
        const q = {
          eq: (c: string, v: string) => {
            h.filters.push(`del:${table}:${c}=${v}`);
            return Object.assign(Promise.resolve({ error: null }), q);
          },
        };
        h.deletes.push(table);
        return q;
      },
    }),
  }),
}));

import handler from "@/pages/api/meeting-polls/[id]/responses";

function call(query: Record<string, string>) {
  const req = { method: "DELETE", query, headers: {} } as unknown as NextApiRequest;
  const res = {
    statusCode: 200,
    setHeader: vi.fn(),
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json() {
      return this;
    },
    end() {
      return this;
    },
  };
  return { req, res: res as unknown as NextApiResponse & { statusCode: number } };
}

beforeEach(() => {
  h.owner = "u1";
  h.responseExists = true;
  h.deletes = [];
  h.filters = [];
});

describe("DELETE /api/meeting-polls/[id]/responses", () => {
  it("organizator usuwa najpierw dostępność, potem odpowiedź – zawsze w obrębie swojej ankiety", async () => {
    const { req, res } = call({ id: POLL, responseId: RESP });
    await handler(req, res);
    expect(res.statusCode).toBe(204);
    expect(h.deletes).toEqual(["meeting_poll_availabilities", "meeting_poll_responses"]);
    expect(h.filters).toContain(`meeting_poll_responses:id=${RESP},poll_id=${POLL}`);
    expect(h.filters).toContain(`del:meeting_poll_responses:poll_id=${POLL}`);
  });

  it("osoba, która nie jest właścicielem ankiety: 403 i nic nie jest usuwane", async () => {
    h.owner = "ktoś-inny";
    const { req, res } = call({ id: POLL, responseId: RESP });
    await handler(req, res);
    expect(res.statusCode).toBe(403);
    expect(h.deletes).toEqual([]);
  });

  it("odpowiedź z innej ankiety: 404", async () => {
    h.responseExists = false;
    const { req, res } = call({ id: POLL, responseId: RESP });
    await handler(req, res);
    expect(res.statusCode).toBe(404);
    expect(h.deletes).toEqual([]);
  });

  it("nieprawidłowe identyfikatory: 400", async () => {
    const { req, res } = call({ id: "x", responseId: RESP });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });
});
