// __tests__/hooks/noUserFetch.test.ts
//
// Hooki pobierające dane nie mogą rzucać „Unauthorized”, gdy komponent
// zamontuje się przed wczytaniem sesji albo po wylogowaniu.

import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const from = vi.fn();
const retry = (fn: () => unknown) => fn();
const abort = { getSignal: () => new AbortController().signal };
const toastValue = { toast: { success: vi.fn(), error: vi.fn(), confirm: vi.fn() } };
vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ user: null, supabase: { from } }) }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => toastValue }));
vi.mock("@/hooks/useRetry", () => ({ useRetry: () => retry }));
vi.mock("@/hooks/useAbortController", () => ({ useAbortController: () => abort }));

import { useBudgetCategories } from "@/hooks/db/useBudgetCategories";
import { useShoppingLists } from "@/hooks/db/useShoppingLists";

describe("bez zalogowanego użytkownika", () => {
  it("nie pobiera danych i nie rzuca błędu", async () => {
    const rejections: unknown[] = [];
    const onRejection = (e: unknown) => rejections.push(e);
    process.on("unhandledRejection", onRejection);
    renderHook(() => useBudgetCategories(2026));
    renderHook(() => useShoppingLists());
    await new Promise((r) => setTimeout(r, 20));
    process.off("unhandledRejection", onRejection);
    expect(rejections).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });
});
