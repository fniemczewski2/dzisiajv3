// __tests__/pages/api/pollResults.test.ts
//
// Wyniki ankiety dla uczestnika: bramka tokenem edycji i opcją organizatora; bez imion innych osób.

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

const state = {
  pollFlag: true,
  tokenMatches: true,
  responses: [{ id: "r1" }, { id: "r2" }],
  availabilities: [] as { response_id: string; date: string; start_time: string }[],
};

function builder(table: string) {
  const filt: Record<string, unknown> = {};
  const list = () => {
    if (table === "meeting_poll_responses") return { data: state.responses, error: null };
    if (table === "meeting_poll_availabilities") {
      const ids = (filt.response_id as string[]) ?? [];
      return { data: state.availabilities.filter((a) => ids.includes(a.response_id)), error: null };
    }
    return { data: [], error: null };
  };
  const single = () => {
    if (table === "meeting_polls") {
      return {
        data: filt.share_token === "abc" ? { id: "poll-1", show_results_to_respondents: state.pollFlag } : null,
        error: null,
      };
    }
    if (table === "meeting_poll_responses") return { data: state.tokenMatches ? { id: "r1" } : null, error: null };
    return { data: null, error: null };
  };
  const b = {
    select: () => b,
    eq: (column: string, value: unknown) => {
      filt[column] = value;
      return b;
    },
    in: (column: string, value: unknown) => {
      filt[column] = value;
      return b;
    },
    maybeSingle: () => Promise.resolve(single()),
    then: (ok: (v: unknown) => unknown, err?: (e: unknown) => unknown) => Promise.resolve(list()).then(ok, err),
  };
  return b;
}

vi.mock("@/lib/server/supabaseAdmin", () => ({ supabaseAdmin: () => ({ from: builder }) }));
vi.mock("@/lib/server/rateLimit", () => ({ clientIp: () => "ip", enforceRateLimit: async () => true }));

import handler from "@/pages/api/meeting-polls/public/[token]/results";

function call(req: Partial<NextApiRequest>) {
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return handler({ method: "GET", headers: {}, ...req } as NextApiRequest, res as unknown as NextApiResponse).then(
    () => res
  );
}

const withToken = { query: { token: "abc" }, headers: { "x-edit-token": "secret" } };

beforeEach(() => {
  state.pollFlag = true;
  state.tokenMatches = true;
  state.availabilities = [
    { response_id: "r1", date: "2026-10-27", start_time: "10:00:00" },
    { response_id: "r2", date: "2026-10-27", start_time: "10:00:00" },
    { response_id: "r1", date: "2026-10-27", start_time: "11:00:00" },
  ];
});

describe("GET /api/meeting-polls/public/[token]/results", () => {
  it("bez tokenu edycji w nagłówku odrzuca żądanie", async () => {
    const res = await call({ query: { token: "abc" } });
    expect(res.statusCode).toBe(400);
  });

  it("gdy organizator ukrył wyniki, zwraca 403 nawet z poprawnym tokenem", async () => {
    state.pollFlag = false;
    const res = await call(withToken);
    expect(res.statusCode).toBe(403);
  });

  it("token nienależący do odpowiedzi w tej ankiecie nie daje dostępu", async () => {
    state.tokenMatches = false;
    const res = await call(withToken);
    expect(res.statusCode).toBe(404);
  });

  it("zwraca liczby dla każdego terminu i nie zwraca danych osobowych", async () => {
    const res = await call(withToken);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      respondents: 2,
      slots: [
        { date: "2026-10-27", start_time: "10:00", count: 2 },
        { date: "2026-10-27", start_time: "11:00", count: 1 },
      ],
    });
    expect(Object.keys(res.body as object).sort()).toEqual(["respondents", "slots"]);
    expect(res.headers["cache-control"]).toBeDefined();
  });
});
