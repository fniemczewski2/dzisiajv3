// __tests__/pages/api/pollSlots.test.ts
//
// GET /api/meeting-polls/public/[token]/slots: zajętość slotów (tylko liczby) w ankiecie zapisów.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

const h = vi.hoisted(() => ({
  poll: null as Record<string, unknown> | null,
  rows: [] as { date: string; start_time: string }[],
  error: null as unknown,
  selects: [] as string[],
}));

vi.mock("@/lib/server/supabaseAdmin", () => ({
  supabaseAdmin: () => ({
    from: (table: string) => {
      const b = {
        select: (columns: string) => {
          h.selects.push(`${table}:${columns}`);
          return b;
        },
        eq: () => b,
        maybeSingle: async () => ({ data: h.poll }),
        then: (resolve: (v: unknown) => unknown) => resolve({ data: h.rows, error: h.error }),
      };
      return b;
    },
  }),
}));
vi.mock("@/lib/server/rateLimit", () => ({ clientIp: () => "1.2.3.4", enforceRateLimit: async () => true }));

import handler from "@/pages/api/meeting-polls/public/[token]/slots";

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
  return handler(
    { method: "GET", query: { token: "tok" }, ...req } as NextApiRequest,
    res as unknown as NextApiResponse
  ).then(() => res);
}

beforeEach(() => {
  h.poll = { id: "poll-1", mode: "signup", slot_capacity: 3, max_slots_per_person: 2 };
  h.rows = [];
  h.error = null;
  h.selects.length = 0;
});

describe("GET /api/meeting-polls/public/[token]/slots", () => {
  it("zwraca pojemność, limit na osobę i liczby zapisów na slot – bez imion i adresów; bez buforowania", async () => {
    h.rows = [
      { date: "2026-12-01", start_time: "10:00:00" },
      { date: "2026-12-01", start_time: "10:00:00" },
      { date: "2026-12-01", start_time: "10:30:00" },
    ];
    const res = await call({});
    expect(res.statusCode).toBe(200);
    expect(res.headers["cache-control"]).toBe("private, no-store");
    expect(res.body).toEqual({
      capacity: 3,
      max_per_person: 2,
      slots: [
        { date: "2026-12-01", start_time: "10:00", booked: 2 },
        { date: "2026-12-01", start_time: "10:30", booked: 1 },
      ],
    });
    // zapytanie o zapisy pobiera wyłącznie datę i godzinę – dane osób nie opuszczają bazy
    expect(h.selects).toContain("meeting_poll_bookings:date, start_time");
  });

  it("404 dla nieistniejącej ankiety, 409 dla ankiety dostępności, 405 dla innej metody, 400 bez tokenu", async () => {
    h.poll = null;
    expect((await call({})).statusCode).toBe(404);
    h.poll = { id: "p", mode: "availability", slot_capacity: 1, max_slots_per_person: 1 };
    expect((await call({})).statusCode).toBe(409);
    expect((await call({ method: "POST" })).statusCode).toBe(405);
    expect((await call({ query: {} })).statusCode).toBe(400);
  });

  it("błąd bazy → 500", async () => {
    h.error = { message: "x" };
    expect((await call({})).statusCode).toBe(500);
  });
});
