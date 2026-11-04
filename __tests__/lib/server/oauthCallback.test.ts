// __tests__/lib/server/oauthCallback.test.ts
//
// Powrót z logowania do kalendarza (Google/Outlook): weryfikacja state, wymiana kodu, zapis zaszyfrowanych tokenów.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

const h = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  authError: null as unknown,
  upsert: vi.fn(),
  fetch: vi.fn(),
  clear: vi.fn(),
}));

vi.mock("@/config/env", () => ({ publicEnv: { appUrl: "https://www.dzisiaj.fun" } }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: () => ({
    auth: { getUser: async () => ({ data: { user: h.user }, error: h.authError }) },
    from: (table: string) => ({ upsert: (row: unknown, opts: unknown) => h.upsert(table, row, opts) }),
  }),
}));
vi.mock("@/lib/server/tokenCrypto", () => ({ encryptToken: (t: string) => `enc(${t})` }));
vi.mock("@/lib/server/oauthState", () => ({ clearStateCookie: (...a: unknown[]) => h.clear(...a) }));

import { handleOAuthCallback, type OAuthProviderConfig } from "@/lib/server/oauthCallback";

const config: OAuthProviderConfig = {
  provider: "google",
  stateCookieName: "g_state",
  tokenUrl: "https://oauth.example/token",
  profileUrl: "https://oauth.example/me",
  calendarName: "Kalendarz Google",
  buildClientCredentials: () => ({ client_id: "cid", client_secret: "secret" }),
  extractEmail: (p) => (typeof p.email === "string" ? p.email : undefined),
};

function run(over: { method?: string; query?: Record<string, unknown>; cookies?: Record<string, string> } = {}) {
  const res = {
    redirected: undefined as { status: number; url: string } | undefined,
    statusCode: 0,
    body: undefined as unknown,
    redirect(a: number | string, b?: string) {
      this.redirected = typeof a === "number" ? { status: a, url: b as string } : { status: 302, url: a };
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
  const req = {
    method: "GET",
    query: { code: "CODE", state: "NONCE" },
    cookies: { g_state: "NONCE" },
    ...over,
  } as unknown as NextApiRequest;
  return handleOAuthCallback(req, res as unknown as NextApiResponse, config).then(() => res);
}

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

beforeEach(() => {
  h.user = { id: "u1" };
  h.authError = null;
  h.upsert.mockReset().mockResolvedValue({ error: null });
  h.clear.mockClear();
  h.fetch
    .mockReset()
    .mockImplementation(async (url: string) =>
      url === config.tokenUrl
        ? ok({ access_token: "AT", refresh_token: "RT", expires_in: 1800 })
        : ok({ email: "anna@x.pl" })
    );
  vi.stubGlobal("fetch", h.fetch);
});

describe("handleOAuthCallback", () => {
  it("metoda inna niż GET → 405", async () => {
    expect((await run({ method: "POST" })).statusCode).toBe(405);
  });

  it("brak code lub state → przekierowanie missing_params", async () => {
    expect((await run({ query: { state: "x" } })).redirected).toEqual({
      status: 307,
      url: "/calendar?error=missing_params",
    });
    expect((await run({ query: { code: "x" } })).redirected?.url).toBe("/calendar?error=missing_params");
  });

  it.each([
    ["brak ciasteczka", {}],
    ["inny state niż w ciasteczku", { g_state: "INNY" }],
  ])("ochrona przed CSRF: %s → invalid_state, ciasteczko wyczyszczone, bez wymiany kodu", async (_l, cookies) => {
    const res = await run({ cookies });
    expect(res.redirected?.url).toBe("/calendar?error=invalid_state");
    expect(h.clear).toHaveBeenCalledWith(expect.anything(), "g_state");
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("state lub code podane jako tablica (parametr powtórzony) → invalid_state", async () => {
    const res = await run({ query: { code: ["a", "b"], state: "NONCE" } });
    expect(res.redirected?.url).toBe("/calendar?error=invalid_state");
  });

  it("niezalogowany użytkownik → auth_failed", async () => {
    h.user = null;
    expect((await run()).redirected?.url).toBe("/calendar?error=auth_failed");
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("sukces: kod wymieniany z właściwym redirect_uri, tokeny zapisane zaszyfrowane, wygaśnięcie z expires_in", async () => {
    const before = Date.now();
    const res = await run();
    expect(res.redirected?.url).toBe("/calendar?sync=success");
    const body = h.fetch.mock.calls[0][1].body as URLSearchParams;
    expect(body.get("redirect_uri")).toBe("https://www.dzisiaj.fun/api/google-calendar/callback");
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(h.fetch.mock.calls[1][1].headers).toEqual({ Authorization: "Bearer AT" });
    const [table, row, opts] = h.upsert.mock.calls[0];
    expect(table).toBe("connected_calendars");
    expect(opts).toEqual({ onConflict: "user_id, account_email, google_calendar_id" });
    expect(row).toMatchObject({
      user_id: "u1",
      provider: "google",
      account_email: "anna@x.pl",
      access_token: "enc(AT)",
      refresh_token: "enc(RT)",
      google_calendar_id: "@account_connection",
      calendar_name: "Kalendarz Google",
    });
    const expiresAt = Date.parse(row.expires_at);
    expect(expiresAt).toBeGreaterThanOrEqual(before + 1800 * 1000 - 50);
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + 1800 * 1000 + 50);
  });

  it("brak refresh_token w odpowiedzi: pole nie jest zapisywane (nie nadpisuje poprzedniego); brak expires_in → 1 h", async () => {
    h.fetch.mockImplementation(async (url: string) =>
      url === config.tokenUrl ? ok({ access_token: "AT" }) : ok({ email: "a@x.pl" })
    );
    await run();
    const row = h.upsert.mock.calls[0][1];
    expect("refresh_token" in row).toBe(false);
    expect(Date.parse(row.expires_at) - Date.now()).toBeGreaterThan(3500 * 1000);
  });

  it("odrzucenie wymiany kodu → token_exchange_failed, profil nie jest pobierany", async () => {
    h.fetch.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: "invalid_grant" }) });
    expect((await run()).redirected?.url).toBe("/calendar?error=token_exchange_failed");
    expect(h.fetch).toHaveBeenCalledTimes(1);
  });

  it("odpowiedź bez access_token mimo statusu 200 → token_exchange_failed", async () => {
    h.fetch.mockResolvedValueOnce(ok({ refresh_token: "RT" }));
    expect((await run()).redirected?.url).toBe("/calendar?error=token_exchange_failed");
  });

  it("błąd pobrania profilu lub profil bez e-maila → profile_fetch_failed, nic nie jest zapisywane", async () => {
    h.fetch.mockImplementation(async (url: string) =>
      url === config.tokenUrl ? ok({ access_token: "AT" }) : { ok: false, status: 401, json: async () => ({}) }
    );
    expect((await run()).redirected?.url).toBe("/calendar?error=profile_fetch_failed");
    h.fetch.mockImplementation(async (url: string) => (url === config.tokenUrl ? ok({ access_token: "AT" }) : ok({})));
    expect((await run()).redirected?.url).toBe("/calendar?error=profile_fetch_failed");
    expect(h.upsert).not.toHaveBeenCalled();
  });

  it("błąd zapisu w bazie → save_failed; wyjątek sieci → auth_failed", async () => {
    h.upsert.mockResolvedValue({ error: { message: "x" } });
    expect((await run()).redirected?.url).toBe("/calendar?error=save_failed");
    h.fetch.mockRejectedValue(new Error("sieć"));
    expect((await run()).redirected?.url).toBe("/calendar?error=auth_failed");
  });
});
