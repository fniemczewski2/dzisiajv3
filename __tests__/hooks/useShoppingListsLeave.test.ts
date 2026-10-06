// __tests__/hooks/useShoppingListsLeave.test.ts
//
// „Usuń” na liście zakupów: właściciel kasuje listę, a odbiorca udostępnionej
// listy tylko się z niej wypisuje (RPC leave_shared_shopping_list) – lista
// zostaje u właściciela. Wcześniej odbiorca dostawał błąd, bo widok próbował
// zwykłego UPDATE, który blokowało RLS.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), confirm: vi.fn(), loading: vi.fn(), dismiss: vi.fn(), batch: vi.fn() };

const ownList = { id: "own", name: "Moja", elements: [], user_id: "me", shared_with_id: "friend" };
const sharedList = { id: "shared", name: "Od znajomego", elements: [], user_id: "friend", shared_with_id: "me" };

const rpcCalls: { fn: string; args: unknown }[] = [];
const deleteCalls: [string, unknown][][] = [];
let rpcResult: { data: unknown; error: unknown } = { data: true, error: null };
let deleteResult: { data: unknown; error: unknown } = { data: [{ id: "own" }], error: null };

function selectBuilder() {
  const b: Record<string, unknown> = {};
  for (const m of ["or", "limit", "eq", "order"]) b[m] = () => b;
  b.abortSignal = () => Promise.resolve({ data: [ownList, sharedList], error: null });
  return b;
}

function deleteBuilder() {
  const filters: [string, unknown][] = [];
  deleteCalls.push(filters);
  const b: Record<string, unknown> = {};
  b.eq = (col: string, val: unknown) => { filters.push([col, val]); return b; };
  b.select = () => Promise.resolve(deleteResult);
  return b;
}

const supabase = {
  from: () => ({ select: () => selectBuilder(), delete: () => deleteBuilder() }),
  rpc: (fn: string, args: unknown) => { rpcCalls.push({ fn, args }); return Promise.resolve(rpcResult); },
};

// Stabilne referencje – hooki zwracają te same obiekty przy każdym renderze, jak w aplikacji.
const auth = { user: { id: "me" }, supabase };
const toastValue = { toast };
const retry = (fn: () => unknown) => fn();

vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => auth }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => toastValue }));
vi.mock("@/hooks/useRetry", () => ({ useRetry: () => retry }));
vi.mock("@/lib/share", () => ({
  resolveSharedEmails: (list: unknown[]) => Promise.resolve(list),
  getUserIdByEmail: () => Promise.resolve(null),
}));

import { useShoppingLists } from "@/hooks/db/useShoppingLists";

async function setup() {
  const hook = renderHook(() => useShoppingLists());
  await waitFor(() => expect(hook.result.current.lists).toHaveLength(2));
  return hook;
}

beforeEach(() => {
  rpcCalls.length = 0;
  deleteCalls.length = 0;
  rpcResult = { data: true, error: null };
  deleteResult = { data: [{ id: "own" }], error: null };
  Object.values(toast).forEach((f) => f.mockClear());
  toast.confirm.mockResolvedValue(true);
});

describe("useShoppingLists – „Usuń” zależnie od roli", () => {
  it("odbiorca wypisuje się przez RPC i niczego nie kasuje", async () => {
    const { result } = await setup();

    await act(() => result.current.deleteShoppingList("shared"));

    expect(toast.confirm).toHaveBeenCalledWith(expect.stringContaining("wypisać się z tej listy"));
    expect(rpcCalls).toEqual([{ fn: "leave_shared_shopping_list", args: { p_list_id: "shared" } }]);
    expect(deleteCalls).toHaveLength(0);
    expect(result.current.lists.map((l) => l.id)).toEqual(["own"]);
    expect(toast.success).toHaveBeenCalledWith("Wypisano Cię z listy zakupów");
  });

  it("właściciel usuwa listę i jest uprzedzany, że zniknie też u odbiorcy", async () => {
    const { result } = await setup();

    await act(() => result.current.deleteShoppingList("own"));

    expect(toast.confirm).toHaveBeenCalledWith(expect.stringContaining("zniknie także u drugiej osoby"));
    expect(rpcCalls).toHaveLength(0);
    expect(deleteCalls).toEqual([[["id", "own"], ["user_id", "me"]]]);
    expect(result.current.lists.map((l) => l.id)).toEqual(["shared"]);
    expect(toast.success).toHaveBeenCalledWith("Usunięto listę zakupów");
  });

  it("gdy wypisanie się nie powiedzie, lista wraca na miejsce", async () => {
    rpcResult = { data: false, error: null };
    const { result } = await setup();

    await act(() => result.current.deleteShoppingList("shared"));

    expect(result.current.lists.map((l) => l.id)).toEqual(["own", "shared"]);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Nie udało się wypisać"));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("anulowanie potwierdzenia niczego nie zmienia", async () => {
    toast.confirm.mockResolvedValue(false);
    const { result } = await setup();

    await act(() => result.current.deleteShoppingList("shared"));

    expect(rpcCalls).toHaveLength(0);
    expect(result.current.lists).toHaveLength(2);
  });
});
