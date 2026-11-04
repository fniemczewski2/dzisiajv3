// __tests__/lib/server/vaultOAuth.test.ts
//
// OAuth vaultu Obsidiana (OneDrive / Google Drive): start (nonce w ciasteczku) i powrót (state, tokeny, zapis).

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

const h = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  credentials: { clientId: "cid", clientSecret: "sec" } as { clientId: string; clientSecret: string } | null,
  upsert: vi.fn(),
  deleted: [] as string[],
  fetch: vi.fn(),
  clear: vi.fn(),
  requireUser: vi.fn(async () => true),
}));

vi.mock("@/config/env", () => ({
  publicEnv: { appUrl: "https://www.dzisiaj.fun" },
  serverEnv: { google: { get: () => h.credentials }, outlook: { get: () => h.credentials } },
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: () => ({
    auth: { getUser: async () => ({ data: { user: h.user } }) },
    from: (table: string) => ({
      upsert: (row: unknown, opts: unknown) => h.upsert(table, row, opts),
      delete: () => ({
        eq: async (_c: string, v: string) => {
          h.deleted.push(`${table}:${v}`);
          return { error: null };
        },
      }),
    }),
  }),
}));
vi.mock("@/lib/server/tokenCrypto", () => ({
  encryptToken: (t: string) => `enc(${t})`,
  decryptToken: (t: string) => t,
}));
vi.mock("@/lib/server/oauthState", () => ({ clearStateCookie: (...a: unknown[]) => h.clear(...a) }));
vi.mock("@/lib/server/fetchWithTimeout", () => ({ fetchWithTimeout: (...a: unknown[]) => h.fetch(...a) }));
vi.mock("@/lib/server/apiGuards", async (orig) => ({
  ...(await orig<typeof import("@/lib/server/apiGuards")>()),
  requireUser: () => h.requireUser(),
}));

import { handleVaultCallback, startVaultOAuth } from "@/lib/server/vaultConnection";
import { VAULT_STATE_COOKIE } from "@/config/server";

function makeRes() {
  return {
    redirected: undefined as { status: number; url: string } | undefined,
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    setHeader(n: string, v: string) {
      this.headers[n.toLowerCase()] = v;
      return this;
    },
    redirect(status: number, url: string) {
      this.redirected = { status, url };
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
}

const callback = async (provider: "onedrive" | "gdrive", req: Partial<NextApiRequest> = {}) => {
  const res = makeRes();
  await handleVaultCallback(
    {
      method: "GET",
      query: { code: "CODE", state: "NONCE" },
      cookies: { [VAULT_STATE_COOKIE]: "NONCE" },
      ...req,
    } as unknown as NextApiRequest,
    res as unknown as NextApiResponse,
    provider
  );
  return res;
};
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

beforeEach(() => {
  h.user = { id: "u1" };
  h.credentials = { clientId: "cid", clientSecret: "sec" };
  h.upsert.mockReset().mockResolvedValue({ error: null });
  h.deleted.length = 0;
  h.clear.mockClear();
  h.requireUser.mockReset().mockResolvedValue(true);
  h.fetch
    .mockReset()
    .mockImplementation(async (url: string) =>
      url.includes("token")
        ? ok({ access_token: "AT", refresh_token: "RT", expires_in: 3600 })
        : ok({ email: "Anna@X.pl", mail: "Anna@X.pl" })
    );
});

describe("startVaultOAuth", () => {
  const start = async (provider: "onedrive" | "gdrive", method = "GET") => {
    const res = makeRes();
    await startVaultOAuth({ method } as NextApiRequest, res as unknown as NextApiResponse, provider);
    return res;
  };

  it("zwraca adres autoryzacji z tym samym state, co nonce w ciasteczku HttpOnly (bez buforowania)", async () => {
    for (const provider of ["gdrive", "onedrive"] as const) {
      const res = await start(provider);
      expect(res.statusCode).toBe(200);
      const nonce = /=([^;]+);/.exec(res.headers["set-cookie"])?.[1];
      expect(res.headers["set-cookie"]).toMatch(/HttpOnly; Secure; SameSite=Lax; Max-Age=600/);
      expect(nonce && nonce.length).toBeGreaterThanOrEqual(30);
      const url = new URL((res.body as { url: string }).url);
      expect(url.searchParams.get("state")).toBe(nonce);
      expect(url.searchParams.get("client_id")).toBe("cid");
      expect(url.searchParams.get("redirect_uri")).toContain("https://www.dzisiaj.fun/api/");
      expect(res.headers["cache-control"]).toBe("private, no-store");
    }
  });

  it("każde wywołanie ma inny nonce", async () => {
    const a = (await start("gdrive")).headers["set-cookie"];
    const b = (await start("gdrive")).headers["set-cookie"];
    expect(a).not.toBe(b);
  });

  it("brak konfiguracji dostawcy → 503; inna metoda → 405; niezalogowany → bez ciasteczka", async () => {
    h.credentials = null;
    expect((await start("gdrive")).statusCode).toBe(503);
    h.credentials = { clientId: "cid", clientSecret: "sec" };
    expect((await start("gdrive", "POST")).statusCode).toBe(405);
    h.requireUser.mockResolvedValue(false);
    const res = await start("gdrive");
    expect(res.headers["set-cookie"]).toBeUndefined();
  });
});

describe("handleVaultCallback", () => {
  it("sukces: tokeny zaszyfrowane, e-mail znormalizowany, stan synchronizacji poprzedniego vaultu wyczyszczony", async () => {
    const res = await callback("gdrive");
    expect(res.redirected).toEqual({ status: 303, url: "/settings?vault=gdrive#obsidian" });
    const [table, row, opts] = h.upsert.mock.calls[0];
    expect(table).toBe("vault_connections");
    expect(opts).toEqual({ onConflict: "user_id" });
    expect(row).toMatchObject({
      user_id: "u1",
      provider: "gdrive",
      email: "anna@x.pl",
      access_token: "enc(AT)",
      refresh_token: "enc(RT)",
    });
    expect(h.deleted).toEqual(["vault_sync_state:u1"]);
    expect(h.clear).toHaveBeenCalledWith(expect.anything(), VAULT_STATE_COOKIE);
  });

  it("OneDrive: wymiana kodu na adres tokenu Microsoftu z redirect_uri aplikacji", async () => {
    await callback("onedrive");
    const [url, init] = h.fetch.mock.calls[0];
    expect(url).toContain("login.microsoftonline.com");
    expect((init.body as URLSearchParams).get("redirect_uri")).toContain("https://www.dzisiaj.fun/api/");
  });

  it.each([
    ["odmowa użytkownika (error w adresie)", { query: { error: "access_denied" } }, "vault_error=denied"],
    ["brak ciasteczka", { cookies: {} }, "vault_error=invalid_state"],
    ["inny state niż w ciasteczku", { query: { code: "C", state: "INNY" } }, "vault_error=invalid_state"],
    ["brak code", { query: { state: "NONCE" } }, "vault_error=invalid_state"],
  ])("%s → %s, bez wymiany kodu", async (_l, req, expected) => {
    const res = await callback("gdrive", req as Partial<NextApiRequest>);
    expect(res.redirected?.url).toBe(`/settings?${expected}#obsidian`);
    expect(h.fetch).not.toHaveBeenCalled();
    expect(h.clear).toHaveBeenCalled();
  });

  it("niezalogowany lub brak konfiguracji → auth_failed", async () => {
    h.user = null;
    expect((await callback("gdrive")).redirected?.url).toContain("vault_error=auth_failed");
    h.user = { id: "u1" };
    h.credentials = null;
    expect((await callback("gdrive")).redirected?.url).toContain("vault_error=auth_failed");
  });

  it("odrzucona wymiana kodu → token_failed; brak refresh_token → no_refresh; brak e-maila → profile_failed", async () => {
    h.fetch.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: "invalid_grant" }) });
    expect((await callback("gdrive")).redirected?.url).toContain("vault_error=token_failed");
    h.fetch.mockResolvedValueOnce(ok({ access_token: "AT" }));
    expect((await callback("gdrive")).redirected?.url).toContain("vault_error=no_refresh");
    h.fetch.mockImplementation(async (url: string) =>
      url.includes("token") ? ok({ access_token: "AT", refresh_token: "RT" }) : ok({})
    );
    expect((await callback("gdrive")).redirected?.url).toContain("vault_error=profile_failed");
    expect(h.upsert).not.toHaveBeenCalled();
  });

  it("błąd zapisu → save_failed bez czyszczenia stanu synchronizacji; wyjątek sieci → token_failed", async () => {
    h.upsert.mockResolvedValue({ error: { message: "x" } });
    expect((await callback("gdrive")).redirected?.url).toContain("vault_error=save_failed");
    expect(h.deleted).toEqual([]);
    h.fetch.mockRejectedValue(new Error("sieć"));
    expect((await callback("gdrive")).redirected?.url).toContain("vault_error=token_failed");
  });
});
