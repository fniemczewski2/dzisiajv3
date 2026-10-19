// __tests__/pages/api/accountExport.test.ts
//
// Eksport danych: mały plik w odpowiedzi, duży (ponad limit odpowiedzi
// Vercela) – przez prywatny bucket i podpisany link.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

let payload: unknown = { data: {} };
const storage = {
  list: vi.fn(() => Promise.resolve({ data: [{ name: "stary.json" }] })),
  remove: vi.fn(() => Promise.resolve({ error: null })),
  upload: vi.fn(() => Promise.resolve({ error: null })),
  createSignedUrl: vi.fn(() => Promise.resolve({ data: { signedUrl: "https://storage/signed" }, error: null })),
};

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1", email: null } } }) },
  }),
}));
vi.mock("@/lib/server/supabaseAdmin", () => ({ supabaseAdmin: () => ({ storage: { from: () => storage } }) }));
vi.mock("@/lib/server/accountData", () => ({ exportUserData: () => Promise.resolve(payload) }));

import handler from "@/pages/api/account/export";

function call() {
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
    send(body: unknown) {
      this.body = body;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return handler({ method: "GET", headers: {} } as NextApiRequest, res as unknown as NextApiResponse).then(() => res);
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/account/export", () => {
  it("mały eksport zwraca plik bezpośrednio", async () => {
    payload = { data: { tasks: [] } };
    const res = await call();
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-disposition"]).toMatch(/attachment; filename="dzisiaj_moje_dane_/);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("duży eksport zapisuje plik w Storage i zwraca podpisany link", async () => {
    payload = { data: { notes: "x".repeat(5 * 1024 * 1024) } };
    const res = await call();
    expect(res.statusCode).toBe(200);
    expect(storage.remove).toHaveBeenCalledWith(["u1/stary.json"]);
    expect(storage.upload).toHaveBeenCalled();
    expect(res.body).toMatchObject({ downloadUrl: "https://storage/signed" });
  });
});
