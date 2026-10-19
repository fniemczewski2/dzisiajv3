// __tests__/hooks/useTransport.test.ts
//
// Transport po przejściu na TanStack Query: odjazdy z ulubionych i w pobliżu,
// podpowiedzi przystanków z opóźnieniem i ich znikanie po wyczyszczeniu pola.

import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const invoke = vi.fn((_name: string, { body }: { body: Record<string, unknown> }) => {
  if (body.stopNames) {
    return Promise.resolve({
      data: {
        success: [
          {
            key: "x",
            stop_name: "Rondo",
            zone_id: "A",
            lat: 52.4,
            lon: 16.9,
            stop_codes: ["R1"],
            ambiguous: false,
            bollards: [],
          },
        ],
      },
      error: null,
    });
  }
  return Promise.resolve({ data: { success: [] }, error: null });
});
const stops = [{ stop_code: "K1", stop_name: "Kórnicka", stop_lat: 52.39, stop_lon: 16.95, zone_id: "A" }];
const supabase = {
  functions: { invoke },
  from: () => ({ select: () => ({ ilike: () => ({ limit: () => Promise.resolve({ data: stops, error: null }) }) }) }),
};
const auth = { supabase, user: { id: "u" } };
vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => auth }));
const favoriteStops = [{ name: "Rondo", zone_id: "A", lat: 52.4, lon: 16.9 }];
const settingsValue = {
  settings: { favorite_stops: favoriteStops },
  addFavoriteStop: vi.fn(),
  removeFavoriteStop: vi.fn(),
  upgradeFavoriteStops: vi.fn(),
  loading: false,
};
vi.mock("@/hooks/db/useSettings", () => ({ useSettings: () => settingsValue }));
vi.mock("@/lib/locationUtils", () => ({
  requestSmartLocation: ({ onSuccess }: { onSuccess: (p: unknown) => void }) =>
    onSuccess({ coords: { latitude: 52.4, longitude: 16.9 } }),
}));
vi.mock("@/hooks/useRetry", () => ({ useRetry: () => (fn: () => unknown) => fn() }));

import { useTransport } from "@/hooks/db/useTransport";

describe("useTransport", () => {
  it("pobiera odjazdy z ulubionych przystanków i w pobliżu", async () => {
    const { result } = renderHook(() => useTransport());
    await waitFor(() => expect(result.current.favoritesGroups).toHaveLength(1));
    expect(result.current.favoritesGroups[0].stop_name).toBe("Rondo");
    await waitFor(() => expect(result.current.loadingNearby).toBe(false));
    const bodies = invoke.mock.calls.map(([, opts]) => opts.body);
    expect(bodies.some((b) => Array.isArray(b.stopNames))).toBe(true);
    expect(bodies.some((b) => Math.abs(Number(b.lat) - 52.4) < 1e-9 && !b.stopNames)).toBe(true);
  });

  it("podpowiedzi pojawiają się po wpisaniu i znikają po wyczyszczeniu pola", async () => {
    const { result } = renderHook(() => useTransport());
    act(() => result.current.setSearchQuery("Kórn"));
    await waitFor(() => expect(result.current.suggestions).toEqual(["Kórnicka (strefa A)"]));
    act(() => result.current.setSearchQuery(""));
    expect(result.current.suggestions).toEqual([]);
  });
});
