// __tests__/pages/api/syncCalendars.test.ts
//
// Cykliczna synchronizacja kalendarzy (cron): autoryzacja, odświeżanie tokenu konta głównego, izolacja błędów kont.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

type Row = Record<string, unknown>;

const h = vi.hoisted(() => ({
  cron: true,
  accounts: [] as Row[],
  updates: [] as { table: string; patch: unknown; id: unknown }[],
  fetchUrls: [] as string[],
  refreshGoogle: vi.fn(),
  refreshOutlook: vi.fn(),
  fetchImpl: vi.fn(),
  dbError: null as unknown,
}));

function chain(table: string, state: { op?: string; patch?: unknown; id?: unknown } = {}): unknown {
  const target = {
    then: (resolve: (v: unknown) => unknown) =>
      resolve({
        data: state.op === "select" && table === "connected_calendars" ? h.accounts : [],
        error: table === "connected_calendars" && state.op === "select" ? h.dbError : null,
        count: 0,
      }),
  } as Record<string, unknown>;
  return new Proxy(target, {
    get(t, prop: string) {
      if (prop === "then") return t.then;
      return (...args: unknown[]) => {
        if (prop === "update") {
          h.updates.push({ table, patch: args[0], id: undefined });
          return chain(table, { ...state, op: "update", patch: args[0] });
        }
        if (prop === "eq" && state.op === "update") {
          const last = h.updates[h.updates.length - 1];
          if (last && last.id === undefined) last.id = args[1];
        }
        return chain(table, { ...state, op: state.op ?? (prop === "select" ? "select" : prop) });
      };
    },
  });
}

vi.mock("@/lib/server/supabaseAdmin", () => ({ supabaseAdmin: () => ({ from: (t: string) => chain(t) }) }));
vi.mock("@/lib/server/cronAuth", () => ({ verifyCronRequest: () => h.cron }));
vi.mock("@/lib/server/tokenCrypto", () => ({
  encryptToken: (t: string) => `enc(${t})`,
  decryptToken: (t?: string | null) => t ?? null,
}));
vi.mock("@/lib/server/oauthTokens", () => ({
  refreshGoogleToken: (t: string) => h.refreshGoogle(t),
  refreshOutlookToken: (t: string) => h.refreshOutlook(t),
}));
vi.mock("@/lib/server/fetchWithTimeout", () => ({
  fetchWithTimeout: async (url: string) => {
    h.fetchUrls.push(url);
    return h.fetchImpl(url);
  },
}));

import handler from "@/pages/api/calendar/sync-calendars";

const main = (over: Row = {}): Row => ({
  id: "main-1",
  user_id: "u1",
  provider: "google",
  account_email: "anna@x.pl",
  google_calendar_id: "@account_connection",
  refresh_token: "RT",
  access_token: "AT0",
  sync_token: null,
  sync_error: null,
  ...over,
});
const calendar = (id: string, over: Row = {}): Row => ({
  id,
  user_id: "u1",
  provider: "google",
  account_email: "anna@x.pl",
  google_calendar_id: `cal-${id}`,
  refresh_token: null,
  sync_token: null,
  sync_error: null,
  ...over,
});

function call(req: Partial<NextApiRequest> = {}) {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
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

beforeEach(() => {
  h.cron = true;
  h.accounts = [];
  h.updates.length = 0;
  h.fetchUrls.length = 0;
  h.dbError = null;
  h.refreshGoogle.mockReset().mockResolvedValue("ACCESS");
  h.refreshOutlook.mockReset().mockResolvedValue({ access_token: "OACCESS" });
  h.fetchImpl.mockReset().mockResolvedValue({ ok: true, status: 200, json: async () => ({ items: [] }) });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("GET /api/calendar/sync-calendars", () => {
  it("inna metoda → 405; brak autoryzacji crona → 401 bez dotykania bazy i sieci", async () => {
    expect((await call({ method: "POST" })).statusCode).toBe(405);
    h.cron = false;
    h.accounts = [main(), calendar("1")];
    const res = await call();
    expect(res.statusCode).toBe(401);
    expect(h.refreshGoogle).not.toHaveBeenCalled();
    expect(h.fetchUrls).toEqual([]);
  });

  it("brak kont → komunikat, brak wywołań dostawcy", async () => {
    expect((await call()).body).toEqual({ message: "Brak kont do synchronizacji." });
    expect(h.refreshGoogle).not.toHaveBeenCalled();
  });

  it("błąd odczytu kont → 500 bez szczegółów", async () => {
    h.dbError = { message: "connection refused to 10.0.0.1" };
    const res = await call();
    expect(res.statusCode).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("10.0.0.1");
  });

  it("odświeża token raz na konto główne dla wielu kalendarzy tego samego konta", async () => {
    h.accounts = [main(), calendar("1"), calendar("2"), calendar("3")];
    const res = await call();
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, failedAccounts: [] });
    expect(h.refreshGoogle).toHaveBeenCalledTimes(1);
    expect(h.refreshGoogle).toHaveBeenCalledWith("RT");
    expect(h.fetchUrls).toHaveLength(3);
  });

  it("nieudane odświeżenie tokenu jest współdzielone: jedno wywołanie dostawcy i jedna aktualizacja błędu", async () => {
    h.refreshGoogle.mockResolvedValue(null);
    h.accounts = [main(), calendar("1"), calendar("2"), calendar("3")];
    await call();
    expect(h.refreshGoogle).toHaveBeenCalledTimes(1);
    expect(
      h.updates.filter((u) => (u.patch as { sync_error?: string }).sync_error === "token_refresh_failed")
    ).toHaveLength(1);
  });

  it("kalendarz bez konta głównego (brak refresh tokenu) jest pomijany bez błędu", async () => {
    h.accounts = [calendar("1")];
    const res = await call();
    expect(res.body).toMatchObject({ success: true, imported: 0, removed: 0 });
    expect(h.refreshGoogle).not.toHaveBeenCalled();
    expect(h.fetchUrls).toEqual([]);
  });

  it("nieudane odświeżenie tokenu: oznaczenie błędu na koncie głównym i pominięcie kalendarza", async () => {
    h.refreshGoogle.mockResolvedValue(null);
    h.accounts = [main(), calendar("1")];
    const res = await call();
    expect(res.body).toMatchObject({ success: true });
    expect(h.updates).toContainEqual({
      table: "connected_calendars",
      patch: { sync_error: "token_refresh_failed" },
      id: "main-1",
    });
    expect(h.fetchUrls).toEqual([]);
  });

  it("poprzedni błąd synchronizacji jest czyszczony po udanym odświeżeniu", async () => {
    h.accounts = [main({ sync_error: "token_refresh_failed" }), calendar("1")];
    await call();
    expect(h.updates).toContainEqual({ table: "connected_calendars", patch: { sync_error: null }, id: "main-1" });
  });

  it("izolacja błędów: awaria jednego kalendarza nie zatrzymuje pozostałych, jest zgłoszona w failedAccounts", async () => {
    h.accounts = [main(), calendar("bad"), calendar("ok")];
    h.fetchImpl.mockImplementation(async (url: string) => {
      if (url.includes("cal-bad")) throw new Error("timeout");
      return { ok: true, status: 200, json: async () => ({ items: [] }) };
    });
    const res = await call();
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: false, failedAccounts: ["bad"] });
    expect(h.fetchUrls.some((u) => u.includes("cal-ok"))).toBe(true);
  });

  it("Outlook: odświeżenie przez dostawcę Microsoft", async () => {
    h.accounts = [main({ provider: "outlook" }), calendar("1", { provider: "outlook" })];
    await call();
    expect(h.refreshOutlook).toHaveBeenCalledWith("RT");
    expect(h.refreshGoogle).not.toHaveBeenCalled();
  });
});
