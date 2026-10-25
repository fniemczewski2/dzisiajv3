// __tests__/hooks/useCrudResource.test.ts
//
// Wspólny CRUD dla 10 modułów: pobranie, optymistyczne dodanie z cofnięciem
// przy błędzie i komunikat dla konkretnego błędu bazy (describeError).

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

type Row = { id: string; user_id: string; name: string };

const db = {
  rows: [] as Row[],
  insertResult: { data: null as unknown, error: null as unknown },
};
const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), confirm: vi.fn(() => Promise.resolve(true)) };

function from() {
  const select = {
    eq: () => select,
    order: () => select,
    abortSignal: () => Promise.resolve({ data: db.rows, error: null }),
  };
  return {
    select: () => select,
    insert: () => ({ select: () => ({ single: () => Promise.resolve(db.insertResult) }) }),
  };
}

// Stałe obiekty – jak w AuthProvider (useMemo); nowy obiekt przy każdym renderze wymuszałby ponowne pobieranie.
const auth = { supabase: { from }, user: { id: "00000000-0000-4000-8000-0000000000aa" } };
vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => auth }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ toast }) }));

import { useCrudResource } from "@/hooks/db/useCrudResource";

const messages = {
  fetchError: "Błąd pobierania.",
  added: "Dodano.",
  addError: "Nie dodano.",
  edited: "Zapisano.",
  editError: "Nie zapisano.",
  deleted: "Usunięto.",
  deleteError: "Nie usunięto.",
  confirmDelete: "Usunąć?",
};

function useThings(describeError?: (e: unknown) => string | undefined) {
  return useCrudResource<Row, { name: string }>({ table: "things", messages, describeError });
}

beforeEach(() => {
  vi.clearAllMocks();
  db.rows = [{ id: "1", user_id: "x", name: "Pierwszy" }];
  db.insertResult = { data: null, error: null };
});

describe("useCrudResource", () => {
  it("pobiera wiersze właściciela", async () => {
    const { result } = renderHook(() => useThings());
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].name).toBe("Pierwszy");
  });

  it("dodaje optymistycznie i podmienia wpis na wiersz z bazy", async () => {
    db.insertResult = { data: { id: "2", user_id: "x", name: "Nowy" }, error: null };
    const { result } = renderHook(() => useThings());
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    await act(async () => {
      await result.current.add({ name: "Nowy" });
    });
    expect(result.current.items.map((r) => r.id)).toEqual(["2", "1"]);
    expect(toast.success).toHaveBeenCalledWith("Dodano.");
  });

  it("przy błędzie wycofuje wpis i pokazuje komunikat z describeError", async () => {
    db.insertResult = { data: null, error: { code: "23505", message: "duplicate" } };
    const { result } = renderHook(() =>
      useThings((e) => ((e as { code?: string }).code === "23505" ? "Taki wpis już istnieje." : undefined))
    );
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    let created: unknown;
    await act(async () => {
      created = await result.current.add({ name: "Duplikat" });
    });
    expect(created).toBeUndefined();
    expect(result.current.items.map((r) => r.id)).toEqual(["1"]);
    expect(toast.error).toHaveBeenCalledWith(
      "Taki wpis już istnieje.",
      expect.objectContaining({ cause: expect.anything() })
    );
  });
});
