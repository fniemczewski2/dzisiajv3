// __tests__/pages/api/calendarRoutes.test.ts
//
// Trasy /api/google-calendar i /api/outlook-calendar: autoryzacja, routing akcji, walidacja wejścia i własność kont.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

const h = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  authError: null as unknown,
  getUserArgs: [] as unknown[],
  filters: [] as string[],
  owned: null as unknown,
  throwOnAuth: false,
}));

function query(table: string): unknown {
  const b: Record<string, unknown> = {
    select: () => b,
    eq: (column: string, value: unknown) => {
      h.filters.push(`${table}.${column}=${String(value)}`);
      return b;
    },
    maybeSingle: async () => ({ data: h.owned }),
    single: async () => ({ data: h.owned, error: null }),
    then: (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null }),
  };
  return b;
}

const client = () => ({
  auth: {
    getUser: async (...args: unknown[]) => {
      h.getUserArgs.push(...args);
      if (h.throwOnAuth) throw new Error("awaria");
      return { data: { user: h.user }, error: h.authError };
    },
  },
  from: query,
});

vi.mock("@supabase/supabase-js", () => ({ createClient: () => client() }));
vi.mock("@/lib/server/rateLimit", () => ({ enforceRateLimit: async () => true }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: () => client() }));
vi.mock("@/config/env", () => ({
  publicEnv: { appUrl: "https://www.dzisiaj.fun", supabaseUrl: "https://x.supabase.co", supabasePublishableKey: "pk" },
  serverEnv: {
    google: {
      require: () => ({ clientId: "gid", clientSecret: "gs" }),
      get: () => ({ clientId: "gid", clientSecret: "gs" }),
    },
    outlook: {
      require: () => ({ clientId: "oid", clientSecret: "os" }),
      get: () => ({ clientId: "oid", clientSecret: "os" }),
    },
  },
}));

import googleHandler from "@/pages/api/google-calendar/index";
import outlookHandler from "@/pages/api/outlook-calendar/index";

function call(handler: (req: NextApiRequest, res: NextApiResponse) => unknown, req: Partial<NextApiRequest>) {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    setHeader(n: string, v: string) {
      this.headers[n.toLowerCase()] = v;
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
  return Promise.resolve(
    handler(
      { method: "GET", headers: {}, query: {}, body: {}, ...req } as NextApiRequest,
      res as unknown as NextApiResponse
    )
  ).then(() => res);
}

const bearer = { authorization: "Bearer jwt-123" };

beforeEach(() => {
  h.user = { id: "u1" };
  h.authError = null;
  h.getUserArgs.length = 0;
  h.filters.length = 0;
  h.owned = null;
  h.throwOnAuth = false;
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("/api/google-calendar", () => {
  const g = (req: Partial<NextApiRequest>) => call(googleHandler, { headers: bearer, ...req });

  it.each([
    ["brak nagłówka", {}],
    ["inny schemat niż Bearer", { authorization: "Basic abc" }],
  ])("%s → 401 bez weryfikacji tokenu", async (_l, headers) => {
    const res = await call(googleHandler, { headers, query: { action: "list-calendars" } });
    expect(res.statusCode).toBe(401);
    expect(h.getUserArgs).toEqual([]);
  });

  it("nieważny token → 401; token jest przekazany do weryfikacji", async () => {
    h.authError = { message: "jwt expired" };
    const res = await g({ query: { action: "list-calendars" } });
    expect(res.statusCode).toBe(401);
    expect(h.getUserArgs).toEqual(["jwt-123"]);
  });

  it("nieznana akcja i niewłaściwa metoda → 404", async () => {
    expect((await g({ query: { action: "nie-ma" } })).statusCode).toBe(404);
    expect((await g({ method: "POST", query: { action: "auth-url" } })).statusCode).toBe(404);
    expect((await g({ method: "DELETE", query: { action: "import" } })).statusCode).toBe(404);
    expect((await g({ method: "GET", query: { action: "export" } })).statusCode).toBe(404);
  });

  it("auth-url: adres Google z identyfikatorem klienta, redirect_uri aplikacji i state równym nonce z ciasteczka", async () => {
    const res = await g({ query: { action: "auth-url" } });
    expect(res.statusCode).toBe(200);
    const url = new URL((res.body as { url: string }).url);
    expect(url.hostname).toBe("accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("gid");
    expect(url.searchParams.get("redirect_uri")).toBe("https://www.dzisiaj.fun/api/google-calendar/callback");
    const nonce = /gcal_oauth_state=([^;]+);/.exec(res.headers["set-cookie"])?.[1];
    expect(url.searchParams.get("state")).toBe(nonce);
    expect(res.headers["set-cookie"]).toMatch(/HttpOnly; Secure; SameSite=Lax/);
  });

  it("import: brak parametrów → 400; konto nienależące do użytkownika → 400 (filtr po user_id), bez sięgania do dostawcy", async () => {
    expect((await g({ method: "POST", query: { action: "import" }, body: {} })).statusCode).toBe(400);
    const res = await g({ method: "POST", query: { action: "import" }, body: { calendarId: "c", accountId: "cudze" } });
    expect(res.statusCode).toBe(400);
    expect(h.filters).toContain("connected_calendars.id=cudze");
    expect(h.filters).toContain("connected_calendars.user_id=u1");
  });

  it("delete-remote bez identyfikatora wydarzenia → 400; nieistniejące wydarzenie → 404", async () => {
    expect((await g({ method: "POST", query: { action: "delete-remote" }, body: {} })).statusCode).toBe(400);
    const res = await g({ method: "POST", query: { action: "delete-remote" }, body: { eventId: "e1" } });
    expect(res.statusCode).toBe(404);
  });

  it("nieoczekiwany wyjątek → 500 bez szczegółów", async () => {
    h.throwOnAuth = true;
    const res = await g({ query: { action: "list-calendars" } });
    expect(res.statusCode).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("awaria");
  });
});

describe("/api/outlook-calendar", () => {
  const o = (req: Partial<NextApiRequest>) => call(outlookHandler, req);

  it("niezalogowany → 401 dla każdej akcji", async () => {
    h.user = null;
    for (const action of ["auth-url", "list-calendars", "import", "export", "disconnect", "delete-remote"]) {
      expect((await o({ method: "POST", query: { action } })).statusCode).toBe(401);
    }
    h.user = { id: "u1" };
    h.authError = { message: "x" };
    expect((await o({ query: { action: "list-calendars" } })).statusCode).toBe(401);
  });

  it("auth-url: zgoda obejmuje zapis w kalendarzu (Calendars.ReadWrite), nie tylko odczyt", async () => {
    const res = await o({ query: { action: "auth-url" } });
    expect(res.statusCode).toBe(200);
    const scope = new URL((res.body as { url: string }).url).searchParams.get("scope") ?? "";
    expect(scope.split(" ")).toContain("Calendars.ReadWrite");
    expect(scope.split(" ")).not.toContain("Calendars.Read");
  });

  it("nieznana akcja → 404", async () => {
    expect((await o({ query: { action: "nie-ma" } })).statusCode).toBe(404);
    expect((await o({ query: {} })).statusCode).toBe(404);
  });

  it.each(["import", "export", "delete-remote"])("%s: metoda inna niż POST → 405", async (action) => {
    expect((await o({ method: "GET", query: { action } })).statusCode).toBe(405);
  });

  it("import: brak parametrów → 400; konto nienależące do użytkownika → 404 (filtr po user_id)", async () => {
    expect((await o({ method: "POST", query: { action: "import" }, body: {} })).statusCode).toBe(400);
    const res = await o({ method: "POST", query: { action: "import" }, body: { calendarId: "c", accountId: "cudze" } });
    expect(res.statusCode).toBe(404);
    expect(h.filters).toContain("connected_calendars.id=cudze");
    expect(h.filters).toContain("connected_calendars.user_id=u1");
  });

  it("delete-remote: brak identyfikatora → 400; nieistniejące wydarzenie → 404", async () => {
    expect((await o({ method: "POST", query: { action: "delete-remote" }, body: {} })).statusCode).toBe(400);
    expect((await o({ method: "POST", query: { action: "delete-remote" }, body: { eventId: "e1" } })).statusCode).toBe(
      404
    );
  });
});
