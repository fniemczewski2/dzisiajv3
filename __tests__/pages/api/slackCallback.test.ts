import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

const upsert = vi.fn();
const insert = vi.fn();
const deleteEq2 = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "user-1" } } }) },
  }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      upsert,
      insert,
      delete: () => ({ eq: () => ({ eq: deleteEq2 }) }),
    }),
  }),
}));

vi.mock("@/lib/server/tokenCrypto", () => ({ encryptToken: (t: string) => `enc:${t}` }));

vi.mock("@/lib/server/fetchWithTimeout", () => ({
  fetchWithTimeout: () =>
    Promise.resolve({
      json: () =>
        Promise.resolve({
          ok: true,
          team: { id: "T1", name: "Zespół" },
          authed_user: { id: "U1", access_token: "xoxp-1" },
        }),
    }),
}));

import handler from "@/pages/api/slack/callback";

function run(query: Record<string, string>, cookies: Record<string, string> = { slack_oauth_state: "abc" }) {
  const req = { method: "GET", query, cookies } as unknown as NextApiRequest;
  const res = {
    redirect: vi.fn(),
    setHeader: vi.fn(),
    appendHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  return handler(req, res as unknown as NextApiResponse).then(() => res);
}

describe("slack callback", () => {
  beforeEach(() => {
    upsert.mockReset();
    insert.mockReset();
    deleteEq2.mockReset();
  });

  it("zapisuje połączenie i wraca do ustawień", async () => {
    upsert.mockResolvedValue({ error: null });
    const res = await run({ code: "c", state: "abc" });
    expect(res.redirect).toHaveBeenCalledWith("/settings?slack=connected");
  });

  it("bez ograniczenia unikalności zapisuje połączenie przez delete + insert", async () => {
    upsert.mockResolvedValue({ error: { code: "42P10", message: "no unique constraint" } });
    deleteEq2.mockResolvedValue({ error: null });
    insert.mockResolvedValue({ error: null });
    const res = await run({ code: "c", state: "abc" });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user-1", team_id: "T1" }));
    expect(res.redirect).toHaveBeenCalledWith("/settings?slack=connected");
  });

  it("zgłasza brak tabel zamiast ogólnego błędu", async () => {
    upsert.mockResolvedValue({ error: { code: "42P01", message: "relation does not exist" } });
    const res = await run({ code: "c", state: "abc" });
    expect(res.redirect).toHaveBeenCalledWith("/settings?slack_error=missing_tables");
  });

  it("rozpoznaje anulowanie w Slacku", async () => {
    const res = await run({ error: "access_denied", state: "abc" });
    expect(res.redirect).toHaveBeenCalledWith("/settings?slack_error=cancelled");
  });

  it("odrzuca niezgodny stan", async () => {
    const res = await run({ code: "c", state: "inny" });
    expect(res.redirect).toHaveBeenCalledWith("/settings?slack_error=invalid_state");
  });
});
