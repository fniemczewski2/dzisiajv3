// __tests__/hooks/trainArrivalCache.test.ts
//
// Planowy przyjazd z pierwszej odpowiedzi PKP PLK trafia od razu na listę
// pociągów (także gdy baza nie ma jeszcze kolumny planned_arrival).

import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const ME = "00000000-0000-4000-8000-0000000000aa";
const row = {
  id: "t1",
  user_id: ME,
  train_number: "IC 1",
  train_name: "",
  date: "2026-10-15",
  departure_time: "10:00",
  from_station: "Poznań Główny",
  to_station: "Warszawa Centralna",
  wagon: "",
  seat: "",
  created_at: "",
};
const { supabaseMock } = vi.hoisted(() => {
  const select = {
    eq: () => select,
    gte: () => select,
    order: () => select,
    abortSignal: () => Promise.resolve({ data: [] as unknown[], error: null }),
  };
  const update = { eq: () => update, is: () => Promise.resolve({ error: { code: "42703" } }) };
  return { supabaseMock: { select, update, from: () => ({ select: () => select, update: () => update }) } };
});
supabaseMock.select.abortSignal = () => Promise.resolve({ data: [row], error: null });

vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ supabase: supabaseMock, user: { id: ME } }) }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ toast: { error: vi.fn(), success: vi.fn() } }) }));
vi.mock("@/hooks/useRetry", () => ({ useRetry: () => (fn: () => unknown) => fn() }));

import { useTrains, useTrainStatus } from "@/hooks/db/useTrains";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("przyjazd pociągu z PKP PLK", () => {
  it("zapisuje się na liście pociągów nawet bez kolumny w bazie", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 15, 9, 0));
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify({ status: "", plannedArrival: "12:45" }), { status: 200 }))
      )
    );
    const { result } = renderHook(() => {
      const trains = useTrains();
      const first = trains.currentTrains[0];
      useTrainStatus(first ?? { trainNumber: "", trainName: "", date: "", from: "", to: "", departureTime: "" });
      return trains;
    });
    await waitFor(() => expect(result.current.currentTrains[0]?.plannedArrival).toBe("12:45"));
  });
});
