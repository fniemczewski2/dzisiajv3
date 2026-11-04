// __tests__/pages/api/pollBook.test.ts
//
// POST /api/meeting-polls/public/[token]/book: walidacja, ochrona przed nadużyciami i wywołanie funkcji bazy.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

const h = vi.hoisted(() => ({
  poll: null as Record<string, unknown> | null,
  dates: [] as { date: string }[],
  rpc: vi.fn(),
  allowed: true,
  rateKeys: [] as string[],
}));

vi.mock("@/lib/server/supabaseAdmin", () => ({
  supabaseAdmin: () => ({
    from: (table: string) => {
      const b = {
        select: () => b,
        eq: () => b,
        maybeSingle: async () => ({ data: table === "meeting_polls" ? h.poll : null }),
        then: (resolve: (v: unknown) => unknown) => resolve({ data: h.dates, error: null }),
      };
      return b;
    },
    rpc: (...args: unknown[]) => h.rpc(...args),
  }),
}));
vi.mock("@/lib/server/rateLimit", () => ({
  clientIp: () => "1.2.3.4",
  enforceRateLimit: async (res: NextApiResponse, _name: string, key: string) => {
    h.rateKeys.push(key);
    if (!h.allowed) {
      res.status(429).json({ error: "Zbyt wiele prób." });
      return false;
    }
    return true;
  },
}));

import handler from "@/pages/api/meeting-polls/public/[token]/book";

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
    { method: "POST", query: { token: "tok" }, body: {}, ...req } as NextApiRequest,
    res as unknown as NextApiResponse
  ).then(() => res);
}

const body = (over: Record<string, unknown> = {}) => ({
  name: " Anna Nowak ",
  email: "Anna@Example.com",
  consent: true,
  slots: [{ date: "2026-12-01", start_time: "10:00" }],
  ...over,
});

beforeEach(() => {
  h.poll = {
    id: "poll-1",
    mode: "signup",
    status: "open",
    closes_at: null,
    slot_duration_minutes: 30,
    time_start: "10:00:00",
    time_end: "12:00:00",
  };
  h.dates = [{ date: "2026-12-01" }];
  h.rpc.mockReset().mockResolvedValue({ data: { ok: true, booked: 1 }, error: null });
  h.allowed = true;
  h.rateKeys.length = 0;
});

describe("POST /api/meeting-polls/public/[token]/book", () => {
  it("zapisuje: wywołuje funkcję bazy z oczyszczonymi danymi i wersją zgody; odpowiedź bez buforowania", async () => {
    const res = await call({ body: body() });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ booked: 1 });
    expect(res.headers["cache-control"]).toBe("private, no-store");
    expect(h.rpc).toHaveBeenCalledWith("book_meeting_poll_slots", {
      p_poll_id: "poll-1",
      p_name: "Anna Nowak",
      p_email: "anna@example.com",
      p_slots: [{ date: "2026-12-01", start_time: "10:00" }],
      p_consent_version: "2026-11-05",
    });
  });

  it("limit żądań liczony per ankieta i adres IP; po przekroczeniu nie dotyka bazy", async () => {
    h.allowed = false;
    const res = await call({ body: body() });
    expect(res.statusCode).toBe(429);
    expect(h.rateKeys).toEqual(["tok:1.2.3.4"]);
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("pułapka na boty: wypełnione ukryte pole daje pozorny sukces bez zapisu", async () => {
    const res = await call({ body: body({ website: "http://spam.example" }) });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ booked: 0 });
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("metoda inna niż POST → 405; brak tokenu → 400", async () => {
    expect((await call({ method: "GET" })).statusCode).toBe(405);
    expect((await call({ query: {} })).statusCode).toBe(400);
  });

  it.each([
    ["brak zgody", { consent: false }],
    ["brak imienia", { name: " " }],
    ["zły e-mail", { email: "x" }],
    ["brak terminów", { slots: [] }],
  ])("walidacja: %s → 400 i brak wywołania bazy", async (_l, over) => {
    const res = await call({ body: body(over) });
    expect(res.statusCode).toBe(400);
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("nieistniejąca ankieta → 404; ankieta dostępności → 409; zamknięta → 409; po terminie zamknięcia → 409", async () => {
    h.poll = null;
    expect((await call({ body: body() })).statusCode).toBe(404);
    h.poll = {
      id: "p",
      mode: "availability",
      status: "open",
      closes_at: null,
      slot_duration_minutes: 30,
      time_start: "10:00",
      time_end: "12:00",
    };
    expect((await call({ body: body() })).statusCode).toBe(409);
    h.poll = {
      id: "p",
      mode: "signup",
      status: "closed",
      closes_at: null,
      slot_duration_minutes: 30,
      time_start: "10:00",
      time_end: "12:00",
    };
    expect((await call({ body: body() })).statusCode).toBe(409);
    h.poll = {
      id: "p",
      mode: "signup",
      status: "open",
      closes_at: "2020-01-01T00:00:00Z",
      slot_duration_minutes: 30,
      time_start: "10:00",
      time_end: "12:00",
    };
    expect((await call({ body: body() })).statusCode).toBe(409);
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("termin spoza siatki ankiety (inny dzień, godzina poza zakresem, nie na granicy slotu) → 400", async () => {
    for (const slot of [
      { date: "2026-12-02", start_time: "10:00" },
      { date: "2026-12-01", start_time: "13:00" },
      { date: "2026-12-01", start_time: "10:10" },
    ]) {
      const res = await call({ body: body({ slots: [slot] }) });
      expect(res.statusCode).toBe(400);
    }
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("odmowa funkcji bazy: 409 z komunikatem i kodem (termin zajęty, limit)", async () => {
    h.rpc.mockResolvedValue({
      data: { ok: false, error: "full", slot: { date: "2026-12-01", start_time: "10:00" } },
      error: null,
    });
    const full = await call({ body: body() });
    expect(full.statusCode).toBe(409);
    expect(full.body).toMatchObject({ code: "full", error: expect.stringContaining("2026-12-01 10:00") });
    h.rpc.mockResolvedValue({ data: { ok: false, error: "limit", max: 1, existing: 1 }, error: null });
    expect((await call({ body: body() })).body).toMatchObject({ code: "limit" });
  });

  it("błąd bazy lub pusta odpowiedź → 500 bez szczegółów", async () => {
    h.rpc.mockResolvedValue({ data: null, error: { message: "relation does not exist" } });
    const res = await call({ body: body() });
    expect(res.statusCode).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("relation");
  });
});
