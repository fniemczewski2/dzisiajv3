// __tests__/hooks/useTasksAccept.test.ts
//
// Regresja: Supabase zwraca tasks.id jako liczbę (kolumna integer), a
// acceptTask wołał na nim id.startsWith(...) -> TypeError przed zapisem,
// połykany w TaskItem. Przycisk "Akceptuj" nic nie robił.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), confirm: vi.fn(), loading: vi.fn(), dismiss: vi.fn(), batch: vi.fn() };
const updates: { payload: unknown; filters: [string, unknown][] }[] = [];
let updateResult: { data: unknown; error: unknown } = { data: [{ id: 42 }], error: null };

const task = { id: 42, title: "Zlecone", status: "waiting_for_acceptance", user_id: "boss", for_user_id: "me", due_date: "2026-09-30", priority: 3 };

function selectBuilder() {
  const b: Record<string, unknown> = {};
  for (const m of ["or", "gte", "lte", "neq", "eq", "order", "in"]) b[m] = () => b;
  b.abortSignal = () => Promise.resolve({ data: [task], error: null });
  b.then = (res: (v: unknown) => void) => res({ data: [task], error: null });
  return b;
}

function updateBuilder(payload: unknown) {
  const entry = { payload, filters: [] as [string, unknown][] };
  updates.push(entry);
  const b: Record<string, unknown> = {};
  b.eq = (col: string, val: unknown) => { entry.filters.push([col, val]); return b; };
  b.select = () => Promise.resolve(updateResult);
  b.then = (res: (v: unknown) => void) => res(updateResult);
  return b;
}

const supabase = {
  from: () => ({ select: () => selectBuilder(), update: (p: unknown) => updateBuilder(p) }),
};

// Stabilne referencje – hooki zwracają te same obiekty przy każdym renderze, jak w aplikacji.
const auth = { user: { id: "me" }, supabase };
const settingsValue = { settings: { show_completed: true, sort_order: "priority" } };
const toastValue = { toast };
const retry = (fn: () => unknown) => fn();

vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => auth }));
vi.mock("@/hooks/db/useSettings", () => ({ useSettings: () => settingsValue }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => toastValue }));
vi.mock("@/hooks/useRetry", () => ({ useRetry: () => retry }));
vi.mock("@/lib/offlineCache", () => ({ readCache: async () => null, writeCache: async () => {} }));
vi.mock("@/hooks/db/useSlackTasks", () => ({ triggerSlackSync: () => {} }));
vi.mock("@/lib/share", () => ({
  resolveSharedEmails: async (list: unknown[]) => list.map(() => ({ display_share_info: null })),
  getUserIdByEmail: async () => null,
}));

import { useTasks } from "@/hooks/db/useTasks";

beforeEach(() => {
  updates.length = 0;
  updateResult = { data: [{ id: 42 }], error: null };
  Object.values(toast).forEach((f) => f.mockClear());
});

describe("useTasks.acceptTask", () => {
  it("accepts a task whose id comes from the DB as a number", async () => {
    const { result } = renderHook(() => useTasks());
    await act(async () => { await result.current.fetchTasks(); });
    await waitFor(() => expect(result.current.tasks).toHaveLength(1));

    await act(async () => {
      await result.current.acceptTask(task.id as unknown as string);
    });

    expect(updates).toHaveLength(1);
    expect(updates[0].payload).toEqual({ status: "pending" });
    expect(updates[0].filters).toContainEqual(["id", "42"]);
    expect(toast.success).toHaveBeenCalledWith("Zaakceptowano zadanie");
    expect(result.current.tasks[0].status).toBe("pending");
    expect(result.current.loading).toBe(false);
  });

  it("only the recipient can accept (filters by for_user_id)", async () => {
    const { result } = renderHook(() => useTasks());
    await act(async () => { await result.current.acceptTask("42"); });
    expect(updates[0].filters).toContainEqual(["for_user_id", "me"]);
  });

  it("reports an error when no row was updated (RLS / already accepted) instead of a false success", async () => {
    updateResult = { data: [], error: null };
    const { result } = renderHook(() => useTasks());
    await act(async () => { await result.current.fetchTasks(); });
    await waitFor(() => expect(result.current.tasks).toHaveLength(1));

    await act(async () => { await result.current.acceptTask("42"); });

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(result.current.tasks[0].status).toBe("waiting_for_acceptance"); // rollback
    expect(result.current.loading).toBe(false);
  });
});

describe("useTasks id handling", () => {
  it("setDoneTask called with a string id (as from the day plan) updates a numeric-id task optimistically", async () => {
    updateResult = { data: { ...task, status: "done" }, error: null };
    const { result } = renderHook(() => useTasks());
    await act(async () => { await result.current.fetchTasks(); });
    await waitFor(() => expect(result.current.tasks).toHaveLength(1));

    let pending!: Promise<unknown>;
    act(() => { pending = Promise.resolve(result.current.setDoneTask("42")); });
    await waitFor(() => expect(result.current.tasks[0]?.status).toBe("done"));
    await act(async () => { await pending; });
  });
});
