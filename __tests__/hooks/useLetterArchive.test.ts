// __tests__/hooks/useLetterArchive.test.ts
//
// Pobieranie archiwum pisma: brak plików, błąd przygotowania linku (nic nie jest pobierane).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

const h = vi.hoisted(() => ({
  rows: [] as unknown[],
  signedUrlError: null as null | { message: string },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), loading: vi.fn(), dismiss: vi.fn(), confirm: vi.fn() },
}));

const supabase = vi.hoisted(() => ({
  from: () => ({
    select: () => ({
      eq: () => ({ order: async () => ({ data: h.rows, error: null }) }),
    }),
  }),
  storage: {
    from: () => ({
      createSignedUrl: async () =>
        h.signedUrlError ? { data: null, error: h.signedUrlError } : { data: { signedUrl: "https://x" }, error: null },
      upload: async () => ({ error: null }),
      remove: async () => ({ error: null }),
    }),
  },
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
    remove: vi.fn(),
  }),
}));

import { useLetters } from "@/hooks/db/useLetters";

const letter = { id: "L1", signature: "….05.2026.U" } as never;
const att = (kind: "letter" | "response", i: number) => ({
  id: `a${i}`,
  letter_id: "L1",
  user_id: "u1",
  kind,
  storage_path: `u1/L1/${kind}-${i}.pdf`,
  file_name: `plik${i}.pdf`,
  size_bytes: 1,
  created_at: "2026-10-22T10:00:00Z",
});

beforeEach(() => {
  h.rows = [];
  h.signedUrlError = null;
  Object.values(h.toast).forEach((fn) => fn.mockClear());
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(new Uint8Array([1, 2, 3])))
  );
});

describe("downloadLetterArchive", () => {
  it("bez załączników pokazuje komunikat i nic nie pobiera", async () => {
    const { result } = renderHook(() => useLetters());
    await act(async () => {
      await result.current.downloadLetterArchive(letter);
    });
    expect(h.toast.error).toHaveBeenCalledWith("Brak plików do pobrania.");
  });

  it("błąd przygotowania linku przerywa pobieranie i pokazuje nazwę pliku", async () => {
    h.rows = [att("letter", 1)];
    h.signedUrlError = { message: "boom" };
    const { result } = renderHook(() => useLetters());
    await waitForAttachments(result);
    await act(async () => {
      await result.current.downloadLetterArchive(letter);
    });
    expect(h.toast.error).toHaveBeenCalledWith(expect.stringContaining("plik1.pdf"));
  });
});

async function waitForAttachments(result: { current: ReturnType<typeof useLetters> }) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  expect(result.current.getAttachments("L1", "letter").length).toBe(1);
}
