// __tests__/lib/pastTrains.test.tsx

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { splitTrains } from "@/hooks/db/useTrains";
import { TrackedTrainCard } from "@/components/transport/TrackedTrainCard";
import type { TrackedTrain } from "@/types/transport";

const t = (id: string, date: string, time: string): TrackedTrain =>
  ({ id, userId: "u", trainNumber: `IC ${id}`, trainName: "", date, departureTime: time, from: "Poznań Główny", to: "Wrocław Główny", wagon: "", seat: "", createdAt: "" }) as TrackedTrain;

describe("odbyte podróże", () => {
  const now = new Date(2026, 9, 15, 12, 0).getTime();

  it("bieżące ±6 h, starsze jako odbyte (najnowsze pierwsze)", () => {
    const { active, past } = splitTrains(
      [t("1", "2026-10-15", "10:00"), t("2", "2026-10-15", "05:00"), t("3", "2026-09-01", "08:00"), t("4", "2026-10-14", "20:00")],
      now
    );
    expect(active.map((x) => x.id)).toEqual(["1"]);
    expect(past.map((x) => x.id)).toEqual(["2", "4", "3"]);
  });

  it("karta odbytej podróży nie pyta PKP PLK o status", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<TrackedTrainCard train={t("9", "2026-09-01", "08:00")} onDelete={vi.fn()} historical />);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/Odbyta/)).toBeTruthy();
    expect(screen.queryByText(/Aktualizacja/)).toBeNull();
    vi.unstubAllGlobals();
  });
});
