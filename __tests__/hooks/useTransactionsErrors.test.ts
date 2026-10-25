// __tests__/hooks/useTransactionsErrors.test.ts
//
// Dzień bez transakcji to pusta lista, a przerwane żądanie nie jest awarią – w obu
// przypadkach użytkownik nie może zobaczyć komunikatu „Nie udało się pobrać transakcji”.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

type Result = { data: unknown[] | null; error: { message: string; code?: string } | null };
let result: Result = { data: [], error: null };
let hangUntilAborted = false;

function builder() {
  const b: Record<string, unknown> = {};
  let signal: AbortSignal | undefined;
  for (const m of ["select", "eq", "gte", "lte", "order"]) b[m] = () => b;
  b.abortSignal = (s: AbortSignal) => {
    signal = s;
    return b;
  };
  b.then = (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) => {
    if (hangUntilAborted && signal) {
      // Żądanie „w locie”: kończy się dopiero po przerwaniu, błędem w wyniku jak w postgrest-js.
      const aborted: Result = { data: null, error: { message: "AbortError: The user aborted a request.", code: "" } };
      return new Promise<Result>((done) => {
        if (signal?.aborted) done(aborted);
        signal?.addEventListener("abort", () => done(aborted));
      }).then(resolve, reject);
    }
    return Promise.resolve(result).then(resolve, reject);
  };
  return b;
}

const supabase = { from: () => builder() };
const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), confirm: vi.fn(), loading: vi.fn(), dismiss: vi.fn() };
vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ user: { id: "me" }, supabase }) }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/hooks/useRetry", () => ({ useRetry: () => (fn: () => unknown) => fn() }));

import { useTransactions } from "@/hooks/db/useFinance";

beforeEach(() => {
  result = { data: [], error: null };
  hangUntilAborted = false;
  toast.error.mockClear();
});

describe("useTransactions – komunikaty błędów", () => {
  it("dzień bez transakcji: pusta lista i brak komunikatu", async () => {
    const { result: hook } = renderHook(() => useTransactions({ from: "2026-10-20", to: "2026-10-20" }));
    await waitFor(() => expect(hook.current.loading).toBe(false));
    expect(hook.current.transactions).toEqual([]);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("brak danych (null) też traktuje jako pusty dzień", async () => {
    result = { data: null, error: null };
    const { result: hook } = renderHook(() => useTransactions({ from: "2026-10-20", to: "2026-10-20" }));
    await waitFor(() => expect(hook.current.loading).toBe(false));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("prawdziwy błąd bazy pokazuje komunikat dokładnie raz", async () => {
    result = { data: null, error: { message: "permission denied", code: "42501" } };
    const { result: hook } = renderHook(() => useTransactions({ from: "2026-10-20", to: "2026-10-20" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Nie udało się pobrać transakcji.",
        expect.objectContaining({ cause: expect.anything() })
      )
    );
    expect(hook.current.transactions).toEqual([]);
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it("zmiana dnia w trakcie pobierania (przerwane żądanie) nie pokazuje komunikatu", async () => {
    hangUntilAborted = true;
    const { rerender } = renderHook(({ day }) => useTransactions({ from: day, to: day }), {
      initialProps: { day: "2026-10-20" },
    });
    await new Promise((r) => setTimeout(r, 20)); // pierwsze zapytanie wisi „w locie”
    hangUntilAborted = false;
    rerender({ day: "2026-10-21" }); // TanStack przerywa pierwsze żądanie
    await new Promise((r) => setTimeout(r, 50));
    expect(toast.error).not.toHaveBeenCalled();
  });
});
