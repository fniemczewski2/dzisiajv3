// __tests__/pages/health.test.tsx

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const h = vi.hoisted(() => ({
  consent: true,
  segments: [] as unknown[],
  records: [] as unknown[],
  daily: [] as unknown[],
  error: null as unknown,
  dates: { sleep: [] as string[], heart: [] as string[], daily: [] as string[] },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), confirm: vi.fn(async () => true) },
}));

vi.mock("@/components/ui/SEO", () => ({ default: () => null }));
vi.mock("@/lib/dateUtils", () => ({ getAppDate: () => "2026-11-02" }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ toast: h.toast }) }));
vi.mock("@/hooks/useHealthConsent", () => ({ useHealthConsent: () => ({ hasConsent: h.consent }) }));
vi.mock("@/hooks/db/useHealthData", () => ({
  useSleepNight: (date: string) => {
    h.dates.sleep.push(date);
    return { data: h.segments, isLoading: false, error: h.error };
  },
  useHeartRateDay: (date: string) => {
    h.dates.heart.push(date);
    return { data: h.records, isLoading: false, error: null };
  },
  useHealthDays: (from: string) => {
    h.dates.daily.push(from);
    return { data: h.daily, error: null };
  },
}));

import HealthPage from "@/pages/health";

beforeEach(() => {
  h.consent = true;
  h.segments = [];
  h.records = [];
  h.daily = [];
  h.error = null;
  h.dates = { sleep: [], heart: [], daily: [] };
  Object.values(h.toast).forEach((fn) => fn.mockClear());
});

describe("strona /health", () => {
  it("ma nagłówek strony, sekcje Sen i Tętno", () => {
    render(<HealthPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Zdrowie" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Sen" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Tętno" })).toBeInTheDocument();
  });

  it("bez zgody: tylko informacja i odnośnik do ustawień, bez wyboru dnia i danych", () => {
    h.consent = false;
    render(<HealthPage />);
    expect(screen.getByRole("link", { name: "Przejdź do ustawień" })).toHaveAttribute("href", "/settings#integracje");
    expect(screen.queryByRole("navigation", { name: "Wybór dnia" })).toBeNull();
    expect(screen.queryByRole("heading", { level: 2, name: "Sen" })).toBeNull();
  });

  it("dane pobierane dla wybranego dnia; zmiana dnia zmienia zapytania, a następnego dnia po dzisiejszym nie ma", () => {
    render(<HealthPage />);
    expect(h.dates.sleep.at(-1)).toBe("2026-11-02");
    expect(h.dates.heart.at(-1)).toBe("2026-11-02");
    expect(screen.getByRole("button", { name: "Następny dzień" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Poprzedni dzień" }));
    expect(h.dates.sleep.at(-1)).toBe("2026-11-01");
    expect(h.dates.heart.at(-1)).toBe("2026-11-01");
    expect(h.dates.daily.at(-1)).toBe("2026-11-01");
    expect(screen.getByRole("button", { name: "Następny dzień" })).toBeEnabled();
  });

  it("pokazuje wyliczone wartości tętna i snu", () => {
    h.records = [
      { recorded_at: "2026-11-02T06:10:00Z", bpm: 60 },
      { recorded_at: "2026-11-02T08:30:00Z", bpm: 90 },
    ];
    h.segments = [{ stage: "core", started_at: "2026-11-01T22:00:00Z", ended_at: "2026-11-02T05:00:00Z" }];
    render(<HealthPage />);
    expect(screen.getByText("Aktualne").parentElement).toHaveTextContent("90 bpm");
    expect(screen.getByText("Średnie").parentElement).toHaveTextContent("75 bpm");
    expect(screen.getByText("Czas w łóżku").parentElement).toHaveTextContent("7 h");
  });

  it("starsze wysyłki bez rejestru: wartości z podsumowania dnia", () => {
    h.daily = [
      {
        date: "2026-11-02",
        sleep_minutes: 431,
        heart_rate_avg: 72,
        heart_rate_min: 51,
        heart_rate_max: 148,
        heart_rate_resting: 55,
      },
    ];
    render(<HealthPage />);
    expect(screen.getByText("Bez podziału na fazy")).toBeInTheDocument();
    expect(screen.getByText("Spoczynkowe").parentElement).toHaveTextContent("55 bpm");
  });

  it("błąd pobierania: komunikat z przyczyną", () => {
    h.error = new Error("baza");
    render(<HealthPage />);
    expect(h.toast.error).toHaveBeenCalledWith("Nie udało się pobrać danych o zdrowiu.", { cause: h.error });
  });
});
