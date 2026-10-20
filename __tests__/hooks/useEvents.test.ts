// __tests__/hooks/useEvents.test.ts
//
// Wydarzenia: zapytanie ograniczone do zakresu widoku (plus powtarzalne),
// a usunięcie wydarzenia powiązanego z Google najpierw usuwa je u dostawcy.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const ME = "00000000-0000-4000-8000-0000000000aa";
const orFilters: string[] = [];
const deleted: string[] = [];
const rows = [
  {
    id: "e1",
    title: "Spotkanie",
    start_time: "2026-10-20T10:00:00",
    end_time: "2026-10-20T11:00:00",
    user_id: ME,
    repeat: "none",
    google_event_id: "g1",
    calendar_id: "cal-1",
  },
];
let remoteOk = true;

const query = {
  select: () => query,
  or: (f: string) => {
    orFilters.push(f);
    return query;
  },
  abortSignal: () => Promise.resolve({ data: rows, error: null }),
  delete: () => ({
    eq: (_c: string, id: string) => {
      deleted.push(id);
      return Promise.resolve({ error: null });
    },
  }),
};
const supabase = { from: () => query };
const auth = { supabase, user: { id: ME } };
const toast = { success: vi.fn(), error: vi.fn(), confirm: vi.fn(() => Promise.resolve(true)) };

vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => auth }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/hooks/useRetry", () => ({ useRetry: () => (fn: () => unknown) => fn() }));
vi.mock("@/lib/calendarExport", () => ({
  syncLinkedEventChange: vi.fn(() => Promise.resolve({ linked: true, ok: remoteOk, label: "Google: Praca" })),
}));

import { useEvents } from "@/hooks/db/useEvents";
import { syncLinkedEventChange } from "@/lib/calendarExport";

beforeEach(() => {
  orFilters.length = 0;
  deleted.length = 0;
  remoteOk = true;
  vi.clearAllMocks();
});

describe("useEvents", () => {
  it("pyta tylko o wydarzenia z zakresu widoku (±1 dzień) i powtarzalne", async () => {
    const { result } = renderHook(() => useEvents("2026-10-01", "2026-10-31"));
    await waitFor(() => expect(result.current.events).toHaveLength(1));
    expect(orFilters[1]).toBe(
      'repeat.neq.none,and(start_time.lte."2026-11-01T23:59:59",end_time.gte."2026-09-30T00:00:00")'
    );
  });

  it("usunięcie powiązanego wydarzenia: najpierw u dostawcy, potem w aplikacji", async () => {
    const { result } = renderHook(() => useEvents("2026-10-01", "2026-10-31"));
    await waitFor(() => expect(result.current.events).toHaveLength(1));
    await act(async () => {
      await result.current.deleteEvent("e1");
    });
    expect(syncLinkedEventChange).toHaveBeenCalledWith(supabase, expect.objectContaining({ id: "e1" }), "delete", ME);
    expect(deleted).toEqual(["e1"]);
  });

  it("gdy dostawca odrzuci usunięcie, wydarzenie zostaje w aplikacji", async () => {
    remoteOk = false;
    const { result } = renderHook(() => useEvents("2026-10-01", "2026-10-31"));
    await waitFor(() => expect(result.current.events).toHaveLength(1));
    await act(async () => {
      await result.current.deleteEvent("e1");
    });
    expect(deleted).toEqual([]);
    expect(result.current.events).toHaveLength(1);
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Wydarzenie zostało w aplikacji/));
  });
});
