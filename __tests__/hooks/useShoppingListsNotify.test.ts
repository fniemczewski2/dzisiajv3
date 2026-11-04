// __tests__/hooks/useShoppingListsNotify.test.ts
//
// Wspólna lista: dodanie i usunięcie pozycji w useShoppingLists trafia do jednego zbiorczego powiadomienia.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Identyfikatory użytkowników w Supabase są UUID – filtry je walidują.
const { ME } = vi.hoisted(() => ({ ME: "00000000-0000-4000-8000-0000000000aa" }));

const writes: unknown[] = [];
let failNext = false;
let release: (() => void) | null = null;

const list = {
  id: "L1",

  user_id: ME,
  name: "Zakupy",
  shared_with_id: "00000000-0000-4000-8000-0000000000bb",
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

const notify = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/lib/edgeFunctions", () => ({ invokeEdgeFunction: (...a: unknown[]) => notify.invoke(...a) }));
vi.mock("@/config/timing", async (orig) => ({
  ...(await orig<typeof import("@/config/timing")>()),
  SHARED_LIST_NOTIFY_DELAY_MS: 60,
}));

import { useShoppingLists } from "@/hooks/db/useShoppingLists";

beforeEach(() => {
  writes.length = 0;
  failNext = false;
  release = null;
  toast.success.mockClear();
  toast.error.mockClear();
  notify.invoke.mockReset().mockResolvedValue({ ok: true, status: 200, data: {} });
});

const add = (text: string, id: string) => (els: { id: string; text: string; completed: boolean }[]) => [
  ...els,
  { id, text, completed: false },
];

describe("powiadomienia o zmianach wspólnej listy", () => {
  it("dodanie 3 i usunięcie 2 pozycji jedna po drugiej → jedno powiadomienie z etykietami", async () => {
    const { result } = renderHook(() => useShoppingLists());
    await waitFor(() => expect(result.current.lists).toHaveLength(1));

    act(() => {
      result.current.updateElements("L1", add("Masło", "c"));
      result.current.updateElements("L1", add("Ser", "d"));
      result.current.updateElements("L1", add("Jajka", "e"));
      result.current.updateElements("L1", (els) => els.filter((e) => e.id !== "a"));
      result.current.updateElements("L1", (els) => els.filter((e) => e.id !== "b"));
    });
    await waitFor(() => expect(notify.invoke).toHaveBeenCalledTimes(1));
    const [, name, body] = notify.invoke.mock.calls[0];
    expect(name).toBe("notify-shared");
    expect(body).toMatchObject({ kind: "list_item", id: "L1" });
    expect((body as { added: string[] }).added.sort()).toEqual(["Jajka", "Masło", "Ser"]);
    expect((body as { removed: string[] }).removed.sort()).toEqual(["Chleb", "Mleko"]);
    // wysyłka po zapisaniu zmian w bazie
    expect(writes).toHaveLength(5);
    await new Promise((r) => setTimeout(r, 150));
    expect(notify.invoke).toHaveBeenCalledTimes(1);
  });

  it("odhaczanie pozycji nie wysyła powiadomienia", async () => {
    const { result } = renderHook(() => useShoppingLists());
    await waitFor(() => expect(result.current.lists).toHaveLength(1));
    act(() => result.current.updateElements("L1", (els) => els.map((e) => ({ ...e, completed: true }))));
    await waitFor(() => expect(writes).toHaveLength(1));
    await new Promise((r) => setTimeout(r, 150));
    expect(notify.invoke).not.toHaveBeenCalled();
  });
});
