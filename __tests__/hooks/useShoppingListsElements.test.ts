// __tests__/hooks/useShoppingListsElements.test.ts
//
// Odhaczanie i usuwanie pozycji: od razu na ekranie, bez przeładowania list
// (bez „mignięcia”), zapisy jednej listy po kolei, cofnięcie przy błędzie.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Identyfikatory użytkowników w Supabase są UUID – filtry je walidują.
const { ME } = vi.hoisted(() => ({ ME: "00000000-0000-4000-8000-0000000000aa" }));

const writes: unknown[] = [];
let selects = 0;
let failNext = false;
let release: (() => void) | null = null;

const list = {
  id: "L1",

  user_id: ME,
  name: "Zakupy",
  shared_with_id: null,
  elements: [
    { id: "a", text: "Mleko", completed: false },
    { id: "b", text: "Chleb", completed: false },
  ],
};

function selectChain() {
  const c: Record<string, unknown> = {};
  c.or = () => c;
  c.limit = () => c;
  c.abortSignal = () => {
    selects++;
    return Promise.resolve({ data: [list], error: null });
  };
  return c;
}
// Kanał Realtime: zapamiętujemy nasłuchy, żeby test mógł zasymulować zmianę u drugiej osoby.
const realtimeHandlers: Array<() => void> = [];
const channelStub = {
  on: (_type: string, _filter: unknown, handler: () => void) => {
    realtimeHandlers.push(handler);
    return channelStub;
  },
  subscribe: () => channelStub,
};

const supabase = {
  channel: () => channelStub,
  removeChannel: () => Promise.resolve("ok"),
  from: () => ({
    select: () => selectChain(),
    update: (patch: unknown) => ({
      eq: () =>
        new Promise((resolve) => {
          const done = () => {
            writes.push(patch);
            const fail = failNext;
            failNext = false;
            resolve({ error: fail ? { message: "x" } : null });
          };
          if (release === null) done();
          else release = done;
        }),
    }),
  }),
};
const toast = { success: vi.fn(), error: vi.fn(), confirm: vi.fn() };
vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "00000000-0000-4000-8000-0000000000aa" }, supabase }),
}));
const toastValue = { toast };
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => toastValue }));
// Stabilne referencje – jak w prawdziwych hookach (inaczej efekt pobierania odpalałby się co render).
const retry = (fn: () => unknown) => fn();
const abort = { getSignal: () => new AbortController().signal };
vi.mock("@/hooks/useRetry", () => ({ useRetry: () => retry }));
vi.mock("@/hooks/useAbortController", () => ({ useAbortController: () => abort }));
vi.mock("@/lib/share", () => ({ resolveSharedEmails: async (l: unknown) => l, getUserIdByEmail: vi.fn() }));

import { useShoppingLists } from "@/hooks/db/useShoppingLists";

beforeEach(() => {
  writes.length = 0;
  selects = 0;
  failNext = false;
  release = null;
  toast.success.mockClear();
  toast.error.mockClear();
});

describe("pozycje listy zakupów", () => {
  it("odhaczenie i usunięcie: od razu, bez przeładowania, bez komunikatu", async () => {
    const { result } = renderHook(() => useShoppingLists());
    await waitFor(() => expect(result.current.lists).toHaveLength(1));
    const selectsAfterLoad = selects;

    act(() => {
      result.current.updateElements("L1", (els) => els.map((e) => (e.id === "a" ? { ...e, completed: true } : e)));
      result.current.updateElements("L1", (els) => els.filter((e) => e.id !== "b"));
    });
    // Oba kliknięcia widać od razu – drugie liczone od stanu po pierwszym.
    expect(result.current.lists[0].elements).toEqual([{ id: "a", text: "Mleko", completed: true }]);
    expect(result.current.fetching).toBe(false);
    expect(result.current.loading).toBe(false);

    await waitFor(() => expect(writes).toHaveLength(2));
    expect(writes[1]).toEqual({ elements: [{ id: "a", text: "Mleko", completed: true }] });
    expect(selects).toBe(selectsAfterLoad); // żadnego ponownego pobierania list
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("błąd zapisu cofa do stanu z bazy", async () => {
    const { result } = renderHook(() => useShoppingLists());
    await waitFor(() => expect(result.current.lists).toHaveLength(1));
    failNext = true;
    act(() => {
      result.current.updateElements("L1", (els) => els.filter((e) => e.id !== "a"));
    });
    expect(result.current.lists[0].elements).toHaveLength(1);
    await waitFor(() => expect(result.current.lists[0].elements).toHaveLength(2));
    expect(toast.error).toHaveBeenCalled();
  });

  it("zmiana listy u drugiej osoby (Realtime) odświeża dane, po zakończeniu własnych zapisów", async () => {
    realtimeHandlers.length = 0;
    const { result } = renderHook(() => useShoppingLists());
    await waitFor(() => expect(result.current.lists).toHaveLength(1));
    expect(realtimeHandlers).toHaveLength(2); // własne listy i udostępnione mi
    const before = selects;
    await act(async () => {
      realtimeHandlers[0]();
    });
    await waitFor(() => expect(selects).toBe(before + 1));
  });
});
