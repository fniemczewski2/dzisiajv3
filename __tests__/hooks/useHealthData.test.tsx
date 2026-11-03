// __tests__/hooks/useHealthData.test.tsx
//
// Zapytania o dane zdrowotne: granice doby, paginacja (baza zwraca zwykle najwyżej 1000 wierszy) i brak zapytań bez zgody.

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const h = vi.hoisted(() => ({
  consent: true,
  user: { id: "u1" } as { id: string } | null,
  /** Wiersze zwracane dla kolejnych stron (po przesunięciu `from`). */
  page: (_from: number): unknown[] => [],
  calls: [] as unknown[][],
  inserted: [] as unknown[],
  deleted: [] as unknown[][],
}));

vi.mock("@/hooks/useHealthConsent", () => ({ useHealthConsent: () => ({ hasConsent: h.consent }) }));
vi.mock("@/providers/AuthProvider", () => {
  const table = (name: string) => {
    const q: Record<string, unknown> = {};
    for (const method of ["select", "gte", "lt", "lte", "eq", "order"]) {
      q[method] = (...args: unknown[]) => {
        h.calls.push([name, method, ...args]);
        return q;
      };
    }
    q.range = (from: number, to: number) => {
      h.calls.push([name, "range", from, to]);
      return Promise.resolve({ data: h.page(from), error: null });
    };
    q.insert = (row: unknown) => {
      h.inserted.push(row);
      return Promise.resolve({ error: null });
    };
    q.delete = () => ({
      eq: (c1: string, v1: unknown) => ({
        eq: (c2: string, v2: unknown) => {
          h.deleted.push([c1, v1, c2, v2]);
          return Promise.resolve({ error: null });
        },
      }),
    });
    return q;
  };
  return { useAuth: () => ({ user: h.user, supabase: { from: table } }) };
});

import { useHeartRateDay, useSleepNight, useWorkoutMutations } from "@/hooks/db/useHealthData";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ recorded_at: `t${i}`, bpm: 70 }));
const rangeCalls = () => h.calls.filter((c) => c[1] === "range").map((c) => [c[2], c[3]]);

beforeEach(() => {
  h.consent = true;
  h.user = { id: "u1" };
  h.page = () => [];
  h.calls = [];
  h.inserted = [];
  h.deleted = [];
});

describe("useHeartRateDay", () => {
  it("pobiera dobę w czasie Warszawy (od północy do północy), od najnowszego", async () => {
    h.page = () => rows(3);
    const { result } = renderHook(() => useHeartRateDay("2026-11-02"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(h.calls).toContainEqual(["health_heart_rate", "gte", "recorded_at", "2026-11-01T23:00:00.000Z"]);
    expect(h.calls).toContainEqual(["health_heart_rate", "lt", "recorded_at", "2026-11-02T23:00:00.000Z"]);
    expect(h.calls).toContainEqual(["health_heart_rate", "order", "recorded_at", { ascending: false }]);
  });

  it("kilka stron: 1000 + 500 wierszy łączy się w jedną listę (limit 1000 wierszy na zapytanie)", async () => {
    h.page = (from) => (from === 0 ? rows(1000) : from === 1000 ? rows(500) : []);
    const { result } = renderHook(() => useHeartRateDay("2026-11-02"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1500);
    expect(rangeCalls()).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("krótka pierwsza strona kończy pobieranie jednym zapytaniem", async () => {
    h.page = () => rows(10);
    const { result } = renderHook(() => useHeartRateDay("2026-11-02"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rangeCalls()).toHaveLength(1);
  });

  it("zabezpieczenie przed nieskończoną pętlą: najwyżej 10 stron", async () => {
    h.page = () => rows(1000);
    const { result } = renderHook(() => useHeartRateDay("2026-11-02"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rangeCalls()).toHaveLength(10);
    expect(result.current.data).toHaveLength(10_000);
  });

  it("bez zgody albo bez poprawnej daty nie wykonuje żadnego zapytania", () => {
    h.consent = false;
    const a = renderHook(() => useHeartRateDay("2026-11-02"), { wrapper });
    h.consent = true;
    const b = renderHook(() => useHeartRateDay("2026-02-30"), { wrapper });
    expect(a.result.current.fetchStatus).toBe("idle");
    expect(b.result.current.fetchStatus).toBe("idle");
    expect(h.calls).toEqual([]);
  });
});

describe("useSleepNight", () => {
  it("pobiera odcinki z oknem wokół dnia (sen kończący się tego dnia mógł zacząć się wcześniej), chronologicznie", async () => {
    h.page = () => [{ stage: "core", started_at: "a", ended_at: "b" }];
    const { result } = renderHook(() => useSleepNight("2026-11-02"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Doba 2.11 (Warszawa): 2026-11-01T23:00Z – 2026-11-02T23:00Z, z zapasem 18 godzin z każdej strony.
    expect(h.calls).toContainEqual(["health_sleep_segments", "gte", "ended_at", "2026-11-01T05:00:00.000Z"]);
    expect(h.calls).toContainEqual(["health_sleep_segments", "lt", "started_at", "2026-11-03T17:00:00.000Z"]);
    expect(h.calls).toContainEqual(["health_sleep_segments", "order", "started_at", { ascending: true }]);
    expect(result.current.data).toHaveLength(1);
  });

  it("bez zgody: brak zapytań", () => {
    h.consent = false;
    const { result } = renderHook(() => useSleepNight("2026-11-02"), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(h.calls).toEqual([]);
  });
});

describe("useWorkoutMutations", () => {
  const row = {
    activity: "Bieg",
    started_at: "2026-11-02T06:10:00.000Z",
    ended_at: "2026-11-02T06:55:00.000Z",
    duration_minutes: 45,
    distance_km: null,
    energy_kcal: null,
    heart_rate_avg: null,
    source: "manual" as const,
  };

  it("dodaje trening przypisany do zalogowanego użytkownika", async () => {
    const { result } = renderHook(() => useWorkoutMutations(), { wrapper });
    await result.current.addWorkout(row);
    expect(h.inserted).toEqual([{ ...row, user_id: "u1" }]);
  });

  it("usuwa trening tylko z warunkiem na użytkownika", async () => {
    const { result } = renderHook(() => useWorkoutMutations(), { wrapper });
    await result.current.removeWorkout("w1");
    expect(h.deleted).toEqual([["id", "w1", "user_id", "u1"]]);
  });

  it("bez sesji: odrzuca operację", async () => {
    h.user = null;
    const { result } = renderHook(() => useWorkoutMutations(), { wrapper });
    await expect(result.current.addWorkout(row)).rejects.toThrow("Brak sesji.");
    expect(h.inserted).toEqual([]);
  });
});
