// __tests__/hooks/useSettingsTaskCategories.test.ts
//
// Zapis ustawień musi działać także wtedy, gdy kod trafił na produkcję przed
// migracją bazy (brak kolumny task_categories) – inaczej żadne ustawienie by się nie zapisało.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const upserts: Record<string, unknown>[] = [];
let missingColumn = false;

function selectBuilder() {
  const b: Record<string, unknown> = {};
  b.eq = () => b;
  b.abortSignal = () => b;
  b.maybeSingle = () => Promise.resolve({ data: { user_id: "me", task_categories: ["Dom"] }, error: null });
  return b;
}
const supabase = {
  from: () => ({
    select: () => selectBuilder(),
    upsert: (row: Record<string, unknown>) => {
      upserts.push(row);
      if (missingColumn && "task_categories" in row) {
        return Promise.resolve({ error: { code: "PGRST204", message: "Could not find the 'task_categories' column of 'settings'" } });
      }
      return Promise.resolve({ error: null });
    },
  }),
};
const auth = { user: { id: "me" }, loadingUser: false, supabase };
const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), confirm: vi.fn(), loading: vi.fn(), dismiss: vi.fn() };
const toastValue = { toast };
const retry = (fn: () => unknown) => fn();
const abort = { getSignal: () => new AbortController().signal, abort: vi.fn() };

vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => auth }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => toastValue }));
vi.mock("@/hooks/useRetry", () => ({ useRetry: () => retry }));
vi.mock("@/hooks/useAbortController", () => ({ useAbortController: () => abort }));
vi.mock("@/lib/locationUtils", () => ({ requestSmartLocation: vi.fn() }));

import { useSettings } from "@/hooks/db/useSettings";

beforeEach(() => {
  upserts.length = 0;
  missingColumn = false;
  toast.success.mockClear();
  toast.error.mockClear();
});

describe("useSettings – task_categories", () => {
  it("wczytuje i zapisuje własne kategorie", async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.settings.task_categories).toEqual(["Dom"]));
    await act(async () => { await result.current.updateSettings({ task_categories: ["Dom", "Ogród"] }); });
    expect(upserts.at(-1)?.task_categories).toEqual(["Dom", "Ogród"]);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("bez kolumny w bazie zapisuje resztę ustawień zamiast zgłaszać błąd", async () => {
    missingColumn = true;
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.settings.task_categories).toEqual(["Dom"]));
    await act(async () => { await result.current.updateSettings({ show_completed: false }); });
    expect(upserts).toHaveLength(2);
    expect("task_categories" in upserts[1]).toBe(false);
    expect(upserts[1].show_completed).toBe(false);
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
  });
});
