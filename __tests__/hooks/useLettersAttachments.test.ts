// __tests__/hooks/useLettersAttachments.test.ts
//
// Limit plików w sekcji, odrzucanie nie-PDF i wycofanie pliku z Storage, gdy zapis w bazie się nie uda.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({
  fixture: [] as unknown[],
  insertError: null as null | { message: string },
  uploads: [] as string[],
  removed: [] as string[][],
  inserted: [] as Record<string, unknown>[],
  dbRows: [] as { storage_path: string }[],
  dbError: null as null | { message: string },
  crudRemove: vi.fn(async () => true),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), loading: vi.fn(), dismiss: vi.fn(), confirm: vi.fn() },
}));

const supabase = vi.hoisted(() => ({
  storage: {
    from: () => ({
      upload: async (path: string) => {
        h.uploads.push(path);
        return { error: null };
      },
      remove: async (paths: string[]) => {
        h.removed.push(paths);
        return { error: null };
      },
      createSignedUrl: async () => ({ data: null, error: { message: "n/a" } }),
    }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        order: async () => ({ data: h.fixture, error: null }),
        // Odczyt ścieżek przed usunięciem pisma: await na samym eq.
        then: (ok: (v: unknown) => unknown) => Promise.resolve({ data: h.dbRows, error: h.dbError }).then(ok),
      }),
    }),
    insert: (row: Record<string, unknown>) => {
      h.inserted.push(row);
      return {
        select: () => ({
          single: async () =>
            h.insertError
              ? { data: null, error: h.insertError }
              : { data: { ...row, id: `att-${h.inserted.length}`, created_at: "2026-10-22T10:00:00Z" }, error: null },
        }),
      };
    },
  }),
}));

vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u1" }, supabase }) }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ toast: h.toast }) }));
vi.mock("@/hooks/db/useCrudResource", () => ({
  useCrudResource: () => ({
    items: [],
    loading: false,
    fetching: false,
    refetch: vi.fn(),
    add: vi.fn(),
    patch: vi.fn(),
    remove: h.crudRemove,
  }),
}));

import { useLetters } from "@/hooks/db/useLetters";
import { MAX_LETTER_ATTACHMENTS } from "@/config/limits";

const pdf = (name: string) => new File(["%PDF"], name, { type: "application/pdf" });
const existing = (n: number, kind = "letter") =>
  Array.from({ length: n }, (_, i) => ({
    id: `e${i}`,
    letter_id: "L1",
    user_id: "u1",
    kind,
    storage_path: `u1/L1/${kind}-e${i}.pdf`,
    file_name: `e${i}.pdf`,
    size_bytes: 1,
    created_at: "2026-10-21T10:00:00Z",
  }));

async function setup(rows: unknown[]) {
  h.fixture = rows;
  const hook = renderHook(() => useLetters());
  await waitFor(() => expect(hook.result.current.getAttachments("L1", "letter").length).toBe(rows.length));
  return hook.result;
}

beforeEach(() => {
  h.fixture = [];
  h.insertError = null;
  h.uploads = [];
  h.removed = [];
  h.inserted = [];
  h.dbRows = [];
  h.dbError = null;
  h.crudRemove.mockClear();
  Object.values(h.toast).forEach((fn) => fn.mockClear());
});

describe("useLetters – załączniki", () => {
  it("zapisuje tylko pliki PDF i pomija resztę z komunikatem", async () => {
    const result = await setup([]);
    const txt = new File(["x"], "notatka.txt", { type: "text/plain" });
    let added = 0;
    await act(async () => {
      added = await result.current.addLetterAttachments("L1", "letter", [pdf("a.pdf"), txt, pdf("c.pdf")]);
    });
    expect(added).toBe(2);
    expect(h.uploads).toHaveLength(2);
    expect(h.toast.error).toHaveBeenCalledWith("„notatka.txt” nie jest plikiem PDF.");
  });

  it("nie przekracza limitu w sekcji i informuje, ile zapisano", async () => {
    const result = await setup(existing(MAX_LETTER_ATTACHMENTS - 1));
    let added = 0;
    await act(async () => {
      added = await result.current.addLetterAttachments("L1", "letter", [pdf("a.pdf"), pdf("b.pdf")]);
    });
    expect(added).toBe(1);
    expect(h.uploads).toHaveLength(1);
    expect(h.toast.error).toHaveBeenCalledWith(expect.stringContaining("Dodano 1 z 2"));
  });

  it("przy pełnym limicie nic nie wysyła", async () => {
    const result = await setup(existing(MAX_LETTER_ATTACHMENTS));
    let added = -1;
    await act(async () => {
      added = await result.current.addLetterAttachments("L1", "letter", [pdf("a.pdf")]);
    });
    expect(added).toBe(0);
    expect(h.uploads).toHaveLength(0);
    expect(h.toast.error).toHaveBeenCalledWith(`Osiągnięto limit ${MAX_LETTER_ATTACHMENTS} plików w tej sekcji.`);
  });

  it("limit dotyczy osobno pisma i odpowiedzi", async () => {
    const result = await setup(existing(MAX_LETTER_ATTACHMENTS));
    let added = 0;
    await act(async () => {
      added = await result.current.addLetterAttachments("L1", "response", [pdf("odp.pdf")]);
    });
    expect(added).toBe(1);
    expect(h.inserted[0]).toMatchObject({ letter_id: "L1", kind: "response", user_id: "u1" });
  });

  it("nadaje każdemu plikowi unikalną ścieżkę w Storage", async () => {
    const result = await setup([]);
    await act(async () => {
      await result.current.addLetterAttachments("L1", "letter", [pdf("a.pdf"), pdf("b.pdf")]);
    });
    expect(new Set(h.uploads).size).toBe(2);
    for (const path of h.uploads) expect(path).toMatch(/^u1\/L1\/letter-.+\.pdf$/);
  });

  it("gdy zapis w bazie się nie uda, usuwa wgrany plik ze Storage", async () => {
    h.insertError = { message: "row-level security" };
    const result = await setup([]);
    let added = -1;
    await act(async () => {
      added = await result.current.addLetterAttachments("L1", "letter", [pdf("a.pdf")]);
    });
    expect(added).toBe(0);
    expect(h.removed).toHaveLength(1);
    expect(h.removed[0][0]).toBe(h.uploads[0]);
    expect(h.toast.error).toHaveBeenCalledWith("Plik „a.pdf” nie został zapisany.");
  });

  it("usuwanie pisma czyta ścieżki z bazy i usuwa wszystkie pliki z Storage", async () => {
    h.dbRows = [{ storage_path: "u1/L1/letter-a.pdf" }, { storage_path: "u1/L1/response-b.pdf" }];
    const result = await setup([]);
    await act(async () => {
      await result.current.deleteLetter("L1");
    });
    expect(h.crudRemove).toHaveBeenCalledWith("L1");
    expect(h.removed).toEqual([["u1/L1/letter-a.pdf", "u1/L1/response-b.pdf"]]);
  });

  it("gdy odczyt załączników się nie uda, pismo nie jest usuwane", async () => {
    h.dbError = { message: "network" };
    const result = await setup([]);
    await act(async () => {
      await result.current.deleteLetter("L1");
    });
    expect(h.crudRemove).not.toHaveBeenCalled();
    expect(h.removed).toHaveLength(0);
    expect(h.toast.error).toHaveBeenCalledWith(expect.stringContaining("Pismo nie zostało usunięte"));
  });
});
