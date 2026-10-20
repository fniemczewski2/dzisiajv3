// __tests__/lib/pastTrains.test.tsx
//
// Pociągi: podział na bieżące, nadchodzące i odbyte według okna odpytywania
// PKP PLK (3 h przed planowym odjazdem – 3 h po planowym przyjeździe) oraz brak
// zapytań do PKP PLK poza tym oknem.

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Zapis planowego przyjazdu (update … is) – w testach zawsze bez błędu.
const { trainsSupabase } = vi.hoisted(() => {
  const chain = { update: () => chain, eq: () => chain, is: () => Promise.resolve({ error: null }) };
  return { trainsSupabase: { from: () => chain } };
});
vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ supabase: trainsSupabase }) }));

import { splitTrains } from "@/hooks/db/useTrains";
import { TrackedTrainCard } from "@/components/transport/TrackedTrainCard";
import { isStatusRelevant, trainStatusWindow, trainTimePhase } from "@/lib/trainPlan";
import type { TrackedTrain } from "@/types/transport";

const t = (id: string, date: string, time: string, plannedArrival: string | null = null): TrackedTrain =>
  ({
    id,
    userId: "u",
    trainNumber: `IC ${id}`,
    trainName: "",
    date,
    departureTime: time,
    from: "Poznań Główny",
    to: "Wrocław Główny",
    wagon: "",
    seat: "",
    createdAt: "",
    plannedArrival,
  }) as TrackedTrain;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("okno odpytywania PKP PLK", () => {
  const train = t("1", "2026-10-15", "10:00", "13:30");
  const at = (h: number, m = 0) => new Date(2026, 9, 15, h, m);

  it("zaczyna się 3 h przed odjazdem i kończy 3 h po planowym przyjeździe", () => {
    const window = trainStatusWindow(train);
    expect(window?.start).toBe(at(7).getTime());
    expect(window?.end).toBe(at(16, 30).getTime());
    expect(isStatusRelevant(train, at(6, 59))).toBe(false);
    expect(isStatusRelevant(train, at(7))).toBe(true);
    expect(isStatusRelevant(train, at(16, 30))).toBe(true);
    expect(isStatusRelevant(train, at(16, 31))).toBe(false);
  });

  it("bez znanego przyjazdu kończy się 3 h po odjeździe", () => {
    expect(trainStatusWindow(t("2", "2026-10-15", "10:00"))?.end).toBe(at(13).getTime());
  });

  it("przyjazd po północy liczy się na następny dzień", () => {
    expect(trainStatusWindow(t("3", "2026-10-15", "22:00", "01:15"))?.end).toBe(new Date(2026, 9, 16, 4, 15).getTime());
  });

  it("dzieli na bieżące, nadchodzące i odbyte", () => {
    const now = at(12).getTime();
    const { current, upcoming, past } = splitTrains(
      [
        t("bieżący", "2026-10-15", "10:00", "13:30"),
        t("później", "2026-10-15", "18:00"),
        t("jutro", "2026-10-16", "08:00"),
        t("rano", "2026-10-15", "05:00", "06:00"),
        t("stary", "2026-09-01", "08:00"),
      ],
      now
    );
    expect(current.map((x) => x.id)).toEqual(["bieżący"]);
    expect(upcoming.map((x) => x.id)).toEqual(["później", "jutro"]);
    expect(past.map((x) => x.id)).toEqual(["rano", "stary"]);
    expect(trainTimePhase(t("x", "2026-10-15", "18:00"), at(12))).toBe("upcoming");
  });
});

describe("karta pociągu", () => {
  it("odbyta podróż nie pyta PKP PLK o status", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<TrackedTrainCard train={t("9", "2026-09-01", "08:00")} onDelete={vi.fn()} historical />);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/Odbyta/)).toBeTruthy();
    expect(screen.queryByText(/Aktualizacja/)).toBeNull();
  });

  it("nadchodząca podróż nie pyta PKP PLK i podaje, od kiedy będzie status", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 15, 12, 0));
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<TrackedTrainCard train={t("7", "2026-10-16", "08:00")} onDelete={vi.fn()} upcoming />);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/Nadchodzący · status od/)).toBeTruthy();
  });

  it("pociąg w oknie pyta PKP PLK o status", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 15, 9, 0));
    const fetchSpy = vi.fn((_url: string) =>
      Promise.resolve(new Response(JSON.stringify({ delay: 0, platform: "4", status: "" }), { status: 200 }))
    );
    vi.stubGlobal("fetch", fetchSpy);
    render(<TrackedTrainCard train={t("5", "2026-10-15", "10:00")} onDelete={vi.fn()} />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(String(fetchSpy.mock.calls[0][0])).toContain("/api/transport/train-status");
  });
});
