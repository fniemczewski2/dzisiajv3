// __tests__/pages/api/mailDelete.test.ts
//
// /api/mail/delete: kosz w skrzynce tylko na żądanie i przy uprawnieniach; błąd kosza nie zmienia aplikacji.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

const h = vi.hoisted(() => ({
  canDeleteInMailbox: true,
  trash: vi.fn(async () => undefined),
  upsert: vi.fn(async () => ({ error: null as null | { message: string } })),
}));

vi.mock("@/lib/server/rateLimit", () => ({ enforceRateLimit: async () => true }));
vi.mock("@/lib/server/mailRoute", async (orig) => {
  const actual = await orig<typeof import("@/lib/server/mailRoute")>();
  return {
    ...actual,
    loadMailContext: async () => ({
      supabase: { from: () => ({ upsert: h.upsert }) },
      userId: "u1",
      accountId: "acc-1",
      accountEmail: "ja@x.pl",
      provider: "gmail",
      canDeleteInMailbox: h.canDeleteInMailbox,
      client: { trash: h.trash },
    }),
  };
});

import handler from "@/pages/api/mail/delete";

function call(body: Record<string, unknown>) {
  const req = { method: "POST", body, headers: {}, query: {} } as unknown as NextApiRequest;
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
  return { req, res: res as unknown as NextApiResponse & { statusCode: number; payload: unknown } };
}

beforeEach(() => {
  h.canDeleteInMailbox = true;
  h.trash.mockReset().mockResolvedValue(undefined);
  h.upsert.mockReset().mockResolvedValue({ error: null });
});

describe("POST /api/mail/delete", () => {
  it("tylko z aplikacji: zapis ukrycia, bez kosza", async () => {
    const { req, res } = call({ accountId: "acc-1", messageId: "m1", mailbox: false });
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(h.trash).not.toHaveBeenCalled();
    expect(h.upsert).toHaveBeenCalledWith(
      { user_id: "u1", account_id: "acc-1", message_id: "m1" },
      { onConflict: "account_id,message_id", ignoreDuplicates: true }
    );
  });

  it("także w poczcie: najpierw kosz, potem ukrycie", async () => {
    const { req, res } = call({ accountId: "acc-1", messageId: "m1", mailbox: true });
    await handler(req, res);
    expect(res.payload).toEqual({ hidden: true, trashed: true });
    expect(h.trash).toHaveBeenCalledWith("m1");
    expect(h.upsert).toHaveBeenCalledTimes(1);
  });

  it("błąd kosza: 502 i aplikacja bez zmian", async () => {
    h.trash.mockRejectedValue(new Error("403"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { req, res } = call({ accountId: "acc-1", messageId: "m1", mailbox: true });
    await handler(req, res);
    expect(res.statusCode).toBe(502);
    expect(h.upsert).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("brak uprawnień do kosza: 409, nic nie jest usuwane", async () => {
    h.canDeleteInMailbox = false;
    const { req, res } = call({ accountId: "acc-1", messageId: "m1", mailbox: true });
    await handler(req, res);
    expect(res.statusCode).toBe(409);
    expect(h.trash).not.toHaveBeenCalled();
    expect(h.upsert).not.toHaveBeenCalled();
  });

  it("nieprawidłowe dane: 400", async () => {
    const bad = call({ accountId: "acc-1", messageId: "../x", mailbox: false });
    await handler(bad.req, bad.res);
    expect(bad.res.statusCode).toBe(400);
    const badFlag = call({ accountId: "acc-1", messageId: "m1", mailbox: "tak" });
    await handler(badFlag.req, badFlag.res);
    expect(badFlag.res.statusCode).toBe(400);
  });
});
