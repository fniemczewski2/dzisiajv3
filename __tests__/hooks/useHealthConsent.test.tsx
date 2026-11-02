// __tests__/hooks/useHealthConsent.test.tsx
//
// Zgoda na dane o zdrowiu: wersja treści oraz cofnięcie zgody usuwające WSZYSTKIE tabele ze zdrowiem.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { HEALTH_CONSENT_VERSION } from "@/config/defaults";

const h = vi.hoisted(() => ({
  settings: {} as Record<string, unknown>,
  failTable: null as string | null,
  deleted: [] as string[],
  updateSettings: vi.fn(async (_patch: unknown) => undefined),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), confirm: vi.fn(async () => true) },
}));

vi.mock("@/hooks/db/useSettings", () => ({
  useSettings: () => ({ settings: h.settings, updateSettings: h.updateSettings }),
}));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ toast: h.toast }) }));
vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: "u1" },
    supabase: {
      from: (table: string) => ({
        delete: () => ({
          eq: async () => {
            h.deleted.push(table);
            return { error: h.failTable === table ? { message: "błąd" } : null };
          },
        }),
      }),
    },
  }),
}));

import { useHealthConsent } from "@/hooks/useHealthConsent";

beforeEach(() => {
  h.settings = { health_consent_at: "2026-11-03T10:00:00Z", health_consent_version: HEALTH_CONSENT_VERSION };
  h.failTable = null;
  h.deleted = [];
  h.updateSettings.mockClear();
  Object.values(h.toast).forEach((fn) => fn.mockClear());
});

describe("useHealthConsent", () => {
  it("zgoda jest ważna tylko dla bieżącej wersji treści", () => {
    expect(renderHook(() => useHealthConsent()).result.current.hasConsent).toBe(true);
    h.settings = { health_consent_at: "2026-10-30T10:00:00Z", health_consent_version: "2026-10-30" };
    expect(renderHook(() => useHealthConsent()).result.current.hasConsent).toBe(false);
    h.settings = { health_consent_at: null, health_consent_version: null };
    expect(renderHook(() => useHealthConsent()).result.current.hasConsent).toBe(false);
  });

  it("udzielenie zgody zapisuje datę i bieżącą wersję", async () => {
    await renderHook(() => useHealthConsent()).result.current.grant();
    expect(h.updateSettings).toHaveBeenCalledWith({
      health_consent_at: expect.any(String),
      health_consent_version: HEALTH_CONSENT_VERSION,
    });
  });

  it("cofnięcie zgody usuwa dane ze wszystkich tabel ze zdrowiem, a dopiero potem zgodę", async () => {
    const ok = await renderHook(() => useHealthConsent()).result.current.revoke();
    expect(ok).toBe(true);
    expect([...h.deleted].sort()).toEqual([
      "health_daily",
      "health_heart_rate",
      "health_sleep_segments",
      "health_workouts",
    ]);
    expect(h.updateSettings).toHaveBeenCalledWith({ health_consent_at: null, health_consent_version: null });
  });

  it("błąd usuwania: zgoda NIE jest cofana (dane zostałyby bez podstawy), komunikat z przyczyną", async () => {
    h.failTable = "health_heart_rate";
    const ok = await renderHook(() => useHealthConsent()).result.current.revoke();
    expect(ok).toBe(false);
    expect(h.updateSettings).not.toHaveBeenCalled();
    expect(h.toast.error).toHaveBeenCalledWith(
      expect.stringContaining("Zgoda nie została cofnięta"),
      expect.anything()
    );
  });
});
