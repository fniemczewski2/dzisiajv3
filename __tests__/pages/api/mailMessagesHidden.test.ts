// __tests__/pages/api/mailMessagesHidden.test.ts

import { describe, it, expect, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

const listRecent = vi.fn(async (limit: number) =>
  Array.from({ length: limit }, (_, i) => ({
    id: `m${i}`,
    threadId: "t",
    subject: `S${i}`,
    from: "a@b.pl",
    date: null,
  }))
);

vi.mock("@/lib/server/mailRoute", () => ({
  loadMailContext: async () => ({
    accountId: "acc-1",
    supabase: {
      from: () => ({
        select: () => ({ eq: () => ({ limit: async () => ({ data: [{ message_id: "m0" }, { message_id: "m2" }] }) }) }),
      }),
    },
    client: { listRecent },
  }),
}));

import handler from "@/pages/api/mail/messages";

describe("GET /api/mail/messages – usunięte z aplikacji", () => {
  it("pomija ukryte i pobiera zapas, żeby lista miała pełną długość", async () => {
    const req = { method: "GET", query: { accountId: "acc-1" }, headers: {} } as unknown as NextApiRequest;
    let payload: { messages: { id: string }[] } = { messages: [] };
    const res = {
      setHeader: vi.fn(),
      status: () => res,
      json: (p: typeof payload) => {
        payload = p;
        return res;
      },
    } as unknown as NextApiResponse;
    await handler(req, res);
    expect(listRecent).toHaveBeenCalledWith(22, null);
    const ids = payload.messages.map((m) => m.id);
    expect(ids).toHaveLength(20);
    expect(ids).not.toContain("m0");
    expect(ids).not.toContain("m2");
  });
});
