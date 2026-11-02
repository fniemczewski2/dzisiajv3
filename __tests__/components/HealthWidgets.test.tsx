// __tests__/components/HealthWidgets.test.tsx

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const h = vi.hoisted(() => ({
  consent: true,
  days: [] as unknown[],
  workouts: [] as unknown[],
}));

vi.mock("@/hooks/useHealthConsent", () => ({ useHealthConsent: () => ({ hasConsent: h.consent }) }));
vi.mock("@/hooks/db/useHealthData", () => ({
  useHealthDays: () => ({ data: h.consent ? h.days : undefined }),
  useHealthWorkouts: () => ({ data: h.consent ? h.workouts : undefined }),
}));

import DailyStepsWidget from "@/components/widgets/DailyStepsWidget";
import HealthActivitySection from "@/components/training/HealthActivitySection";
import { formatMinutes, formatSteps } from "@/lib/health/format";

beforeEach(() => {
  h.consent = true;
  h.days = [];
  h.workouts = [];
});

describe("kroki w widoku dnia", () => {
  it("pokazuje liczbę kroków z nazwaną sekcją", () => {
    h.days = [{ date: "2026-10-30", steps: 8423, sleep_minutes: null, heart_rate_avg: null, heart_rate_resting: null }];
    render(<DailyStepsWidget date="2026-10-30" />);
    expect(screen.getByRole("region", { name: "Kroki" })).toHaveTextContent(`${formatSteps(8423)} kroków`);
  });

  it("bez danych lub bez zgody nie renderuje nic", () => {
    const { container } = render(<DailyStepsWidget date="2026-10-30" />);
    expect(container).toBeEmptyDOMElement();
    h.consent = false;
    const second = render(<DailyStepsWidget date="2026-10-30" />);
    expect(second.container).toBeEmptyDOMElement();
  });
});

describe("aktywność w module Trening", () => {
  it("bez zgody: odnośnik do ustawień zamiast danych", () => {
    h.consent = false;
    render(<HealthActivitySection />);
    expect(screen.getByRole("link", { name: "ustawieniach" })).toHaveAttribute("href", "/settings#integracje");
  });

  it("tabela dni i lista treningów", () => {
    h.days = [{ date: "2026-10-30", steps: 9000, sleep_minutes: 431, heart_rate_avg: 70, heart_rate_resting: 55 }];
    h.workouts = [
      {
        id: "w1",
        activity: "Bieg",
        started_at: "2026-10-30T06:10:00Z",
        duration_minutes: 35,
        distance_km: 6.25,
        energy_kcal: 400,
        heart_rate_avg: 151,
      },
    ];
    render(<HealthActivitySection />);
    expect(screen.getByRole("table")).toHaveTextContent("7 h 11 min");
    expect(screen.getByRole("list", { name: "Treningi" })).toHaveTextContent("Bieg");
    expect(screen.getByRole("list", { name: "Treningi" })).toHaveTextContent("6,25 km");
  });
});

describe("formatowanie", () => {
  it("minuty", () => {
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(120)).toBe("2 h");
    expect(formatMinutes(431)).toBe("7 h 11 min");
  });
});
