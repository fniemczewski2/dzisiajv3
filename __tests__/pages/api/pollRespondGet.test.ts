// __tests__/pages/api/pollRespondGet.test.ts
//
// Odczyt własnej odpowiedzi w ankiecie: token edycji tylko w nagłówku
// (parametr w adresie URL trafiałby do logów i historii przeglądarki).

import { describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

const tables: Record<string, unknown> = {
  meeting_polls: { id: "poll-1" },
  meeting_poll_responses: { id: "resp-1", respondent_name: "Anna", respondent_email: null },
};
const filters: string[] = [];

function builder(table: string) {
  const b = {
    select: () => b,
    eq: (column: string, value: unknown) => {
      filters.push(`${table}.${column}=${String(value)}`);
      return table === "meeting_poll_availabilities"
        ? Promise.resolve({ data: [{ date: "2026-10-20", start_time: "09:00:00" }] })
        : b;
    },
    maybeSingle: () => Promise.resolve({ data: tables[table] ?? null }),
  };
  return b;
}

vi.mock("@/lib/server/supabaseAdmin", () => ({ supabaseAdmin: () => ({ from: builder }) }));

import handler from "@/pages/api/meeting-polls/public/[token]/respond";

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

describe("GET /api/meeting-polls/public/[token]/respond", () => {
  it("odrzuca token edycji podany w adresie URL", async () => {
    const res = await call({ query: { token: "abc", edit_token: "secret" } });
    expect(res.statusCode).toBe(400);
  });

  it("zwraca odpowiedź dla tokenu z nagłówka i nie pozwala jej buforować", async () => {
    filters.length = 0;
    const res = await call({ query: { token: "abc" }, headers: { "x-edit-token": "secret" } });
    expect(res.statusCode).toBe(200);
    expect(res.headers["cache-control"]).toBe("private, no-store");
    expect(filters).toContain("meeting_poll_responses.edit_token=secret");
    expect(res.body).toEqual({
      respondent_name: "Anna",
      respondent_email: null,
      slots: [{ date: "2026-10-20", start_time: "09:00" }],
    });
  });
});
