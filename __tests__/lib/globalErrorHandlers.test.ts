// __tests__/lib/globalErrorHandlers.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";

const createClient = vi.fn(() => ({ auth: { getSession: async () => ({ data: { session: null } }) } }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => createClient() }));
vi.mock("@/lib/edgeFunctions", () => ({ invokeEdgeFunction: vi.fn() }));

import { installGlobalErrorHandlers } from "@/lib/errorReport";

beforeEach(() => {
  createClient.mockClear();
});

describe("installGlobalErrorHandlers", () => {
  it("podpina obsługę zdarzeń błędów i nieobsłużonych promisów", () => {
    const target = new EventTarget() as unknown as Window;
    const add = vi.spyOn(target, "addEventListener");
    installGlobalErrorHandlers(target);
    expect(add).toHaveBeenCalledWith("error", expect.any(Function));
    expect(add).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));
  });

  it("zdarzenie błędu trafia do raportera", () => {
    const target = new EventTarget() as unknown as Window;
    installGlobalErrorHandlers(target);
    target.dispatchEvent(new ErrorEvent("error", { error: new Error("globalny-blad-1") }));
    expect(createClient).toHaveBeenCalled();
  });

  it("sprzątanie usuwa oba nasłuchiwacze – kolejne zdarzenia nic nie raportują", () => {
    const target = new EventTarget() as unknown as Window;
    const cleanup = installGlobalErrorHandlers(target);
    cleanup();
    target.dispatchEvent(new ErrorEvent("error", { error: new Error("po-sprzataniu-2") }));
    expect(createClient).not.toHaveBeenCalled();
  });
});
