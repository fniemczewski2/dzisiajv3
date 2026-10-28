// __tests__/lib/server/mailOAuth.test.ts
//
// Wspólny przepływ OAuth kont poczty: stan, wymiana kodu, zapis konta i przekierowania z wynikiem.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

const h = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  count: 0,
  existing: null as null | { id: string },
  inserted: [] as Record<string, unknown>[],
  fetchResponses: [] as Response[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: () => ({
    auth: { getUser: async () => ({ data: { user: h.user } }) },
    from: () => ({
      select: (_cols: string, opts?: { head?: boolean }) =>
        opts?.head
          ? Promise.resolve({ count: h.count })
          : { eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: h.existing }) }) }) },
      insert: async (row: Record<string, unknown>) => {
        h.inserted.push(row);
        return { error: null };
      },
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  }),
}));
vi.mock("@/lib/server/fetchWithTimeout", () => ({ fetchWithTimeout: async () => h.fetchResponses.shift() }));
vi.mock("@/lib/server/tokenCrypto", () => ({ encryptToken: (v: string) => `enc:${v}` }));

import { handleMailOAuthCallback, type MailOAuthConfig } from "@/lib/server/mailOAuth";

const config: MailOAuthConfig = {
  provider: "gmail",
  stateCookieName: "st",
  redirectPath: "/api/mail/gmail/callback",
  tokenUrl: "https://token",
  profileUrl: "https://profile",
  scope: "s",
  credentials: () => ({ clientId: "c", clientSecret: "s" }),
  buildAuthUrl: () => "https://auth",
  extractEmail: (p) => (p as { email?: string } | null)?.email ?? null,
};

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

function call(query: Record<string, string>, cookie: string | undefined = "nonce") {
  const req = { method: "GET", query, cookies: cookie ? { st: cookie } : {}, headers: {} } as unknown as NextApiRequest;
  const res = {
    statusCode: 200,
    location: "",
    setHeader: vi.fn(),
    appendHeader: vi.fn(),
    getHeader: vi.fn(),
    redirect(status: number, url: string) {
      this.statusCode = status;
      this.location = url;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  };
  return { req, res: res as unknown as NextApiResponse & { location: string } };
}

beforeEach(() => {
  h.user = { id: "u1" };
  h.count = 0;
  h.existing = null;
  h.inserted = [];
  h.fetchResponses = [];
});

describe("handleMailOAuthCallback", () => {
  it("niezgodny stan kończy się error=invalid_state bez wymiany kodu", async () => {
    const { req, res } = call({ code: "x", state: "inny" });
    await handleMailOAuthCallback(req, res, config);
    expect(res.location).toBe("/mail?error=invalid_state");
    expect(h.inserted).toHaveLength(0);
  });

  it("odmowa u dostawcy daje error=denied", async () => {
    const { req, res } = call({ error: "access_denied" });
    await handleMailOAuthCallback(req, res, config);
    expect(res.location).toBe("/mail?error=denied");
  });

  it("poprawny przepływ zapisuje konto z zaszyfrowanymi tokenami i wraca z connected=gmail", async () => {
    h.fetchResponses = [
      json({ access_token: "A", refresh_token: "R", expires_in: 3600 }),
      json({ email: "Anna@Example.com" }),
    ];
    const { req, res } = call({ code: "x", state: "nonce" });
    await handleMailOAuthCallback(req, res, config);
    expect(res.location).toBe("/mail?connected=gmail");
    expect(h.inserted[0]).toMatchObject({
      user_id: "u1",
      provider: "gmail",
      email: "anna@example.com",
      access_token: "enc:A",
      refresh_token: "enc:R",
    });
  });

  it("limit kont kończy się error=limit bez zapisu", async () => {
    h.count = 5;
    h.fetchResponses = [json({ access_token: "A", refresh_token: "R" }), json({ email: "a@b.pl" })];
    const { req, res } = call({ code: "x", state: "nonce" });
    await handleMailOAuthCallback(req, res, config);
    expect(res.location).toBe("/mail?error=limit");
    expect(h.inserted).toHaveLength(0);
  });

  it("brak sesji daje error=auth_failed", async () => {
    h.user = null;
    const { req, res } = call({ code: "x", state: "nonce" });
    await handleMailOAuthCallback(req, res, config);
    expect(res.location).toBe("/mail?error=auth_failed");
  });
});

describe("handleMailOAuthCallback – diagnostyka", () => {
  it("odmowa dostawcy jest logowana z kodem i opisem błędu (bez tokenów)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.fetchResponses = [
      new Response(
        JSON.stringify({ error: "invalid_client", error_description: "AADSTS7000215: Invalid client secret." }),
        {
          status: 401,
        }
      ),
    ];
    const { req, res } = call({ code: "x", state: "nonce" });
    await handleMailOAuthCallback(req, res, config);
    expect(res.location).toBe("/mail?error=token_failed");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("wymiana kodu odrzucona"),
      expect.objectContaining({
        status: 401,
        error: "invalid_client",
        description: expect.stringContaining("AADSTS7000215"),
      })
    );
    spy.mockRestore();
  });

  it("błąd zapisu (np. szyfrowania) daje save_failed, nie token_failed", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.fetchResponses = [
      new Response(JSON.stringify({ access_token: "A", refresh_token: "R" }), { status: 200 }),
      new Response(JSON.stringify({ email: "a@b.pl" }), { status: 200 }),
    ];
    const crypto = await import("@/lib/server/tokenCrypto");
    const enc = vi.spyOn(crypto, "encryptToken").mockImplementation(() => {
      throw new Error("Brak klucza szyfrowania");
    });
    const { req, res } = call({ code: "x", state: "nonce" });
    await handleMailOAuthCallback(req, res, config);
    expect(res.location).toBe("/mail?error=save_failed");
    enc.mockRestore();
    spy.mockRestore();
  });
});

describe("handlery OAuth nie zwracają wartości (Next.js: „API handler should not return a value”)", () => {
  it("handleMailOAuthCallback zwraca undefined także przy przekierowaniu", async () => {
    const { req, res } = call({ error: "access_denied" });
    await expect(handleMailOAuthCallback(req, res, config)).resolves.toBeUndefined();
    expect(res.location).toBe("/mail?error=denied");
  });

  it("trasy /api/mail/<dostawca> i callbacki kalendarzy kończą się bez wartości", async () => {
    const handlers = await Promise.all([
      import("@/pages/api/mail/gmail/callback"),
      import("@/pages/api/mail/outlook/callback"),
      import("@/pages/api/google-calendar/callback"),
      import("@/pages/api/outlook-calendar/callback"),
    ]);
    for (const mod of handlers) {
      const { req, res } = call({ error: "access_denied" });
      await expect(mod.default(req, res)).resolves.toBeUndefined();
    }
  });
});
