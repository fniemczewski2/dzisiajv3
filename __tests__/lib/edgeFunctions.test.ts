// __tests__/lib/edgeFunctions.test.ts

import { describe, expect, it } from "vitest";
import { FunctionsFetchError, FunctionsHttpError, type SupabaseClient } from "@supabase/supabase-js";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";

function client(result: { data: unknown; error: unknown }) {
  return { functions: { invoke: () => Promise.resolve(result) } } as unknown as SupabaseClient;
}

describe("invokeEdgeFunction", () => {
  it("zwraca dane przy powodzeniu", async () => {
    const result = await invokeEdgeFunction(client({ data: { success: true }, error: null }), "send-love", {});
    expect(result).toEqual({ ok: true, status: 200, data: { success: true } });
  });

  it("przy błędzie HTTP podaje status i treść odpowiedzi", async () => {
    const response = new Response(JSON.stringify({ error: "Limit" }), { status: 429 });
    const result = await invokeEdgeFunction(
      client({ data: null, error: new FunctionsHttpError(response) }),
      "send-push",
      {}
    );
    expect(result).toEqual({ ok: false, status: 429, data: { error: "Limit" }, networkError: false });
  });

  it("rozpoznaje błąd sieci", async () => {
    const result = await invokeEdgeFunction(
      client({ data: null, error: new FunctionsFetchError(new TypeError("fetch failed")) }),
      "send-push",
      {}
    );
    expect(result).toMatchObject({ ok: false, status: null, networkError: true });
  });
});
