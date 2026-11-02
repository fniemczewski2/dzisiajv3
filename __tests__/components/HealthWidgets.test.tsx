// __tests__/components/HealthWidgets.test.tsx

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({
  consent: true,
  days: [] as unknown[],
  workouts: [] as unknown[],
  addWorkout: vi.fn(async (_row: unknown) => undefined as unknown),
  removeWorkout: vi.fn(async (_id: string) => undefined as unknown),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), confirm: vi.fn(async () => true) },
}));

vi.mock("@/hooks/useHealthConsent", () => ({ useHealthConsent: () => ({ hasConsent: h.consent }) }));
vi.mock("@/hooks/db/useHealthData", () => ({
  useHealthDays: () => ({ data: h.consent ? h.days : undefined }),
  useHealthWorkouts: () => ({ data: h.consent ? h.workouts : undefined }),
  useWorkoutMutations: () => ({ addWorkout: h.addWorkout, removeWorkout: h.removeWorkout, saving: false }),
}));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ toast: h.toast }) }));
vi.mock("@/hooks/db/useSettings", () => ({ useSettings: () => ({ settings: { daily_steps_goal: 10000 } }) }));

import DailyStepsWidget from "@/components/widgets/DailyStepsWidget";
import HealthActivitySection from "@/components/training/HealthActivitySection";
import { formatMinutes, formatSteps } from "@/lib/health/format";

const day = (date: string, steps: number | null) => ({
  date,
  steps,
  sleep_minutes: 431,
  heart_rate_avg: 70,
  heart_rate_min: 50,
  heart_rate_max: 150,
  heart_rate_resting: 55,
});
const workout = (over: Record<string, unknown> = {}) => ({
  id: "w1",
  activity: "Bieg",
  started_at: "2026-10-30T06:10:00Z",
  duration_minutes: 35,
  distance_km: 6.25,
  energy_kcal: 400,
  heart_rate_avg: 151,
  source: "shortcut",
  ...over,
});

beforeEach(() => {
  h.consent = true;
  h.days = [];
  h.workouts = [];
  h.addWorkout.mockReset().mockResolvedValue(undefined);
  h.removeWorkout.mockReset().mockResolvedValue(undefined);
  Object.values(h.toast).forEach((fn) => fn.mockClear());
  h.toast.confirm.mockResolvedValue(true);
});

describe("kroki w widoku dnia", () => {
  it("pokazuje liczbę kroków z nazwaną sekcją", () => {
    h.days = [day("2026-10-30", 8423)];
    render(<DailyStepsWidget date="2026-10-30" />);
    const region = screen.getByRole("region", { name: "Kroki" });
    expect(region).toHaveTextContent(formatSteps(8423));
    // Pasek postępu względem celu dziennego (10 000): 8423 → 84,23%.
    expect(region.querySelector("[style]")).toHaveStyle({ width: "84.23%" });
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
  it("bez zgody: odnośnik do ustawień, bez przycisku dodawania", () => {
    h.consent = false;
    render(<HealthActivitySection />);
    expect(screen.getByRole("link", { name: "ustawieniach" })).toHaveAttribute("href", "/settings#integracje");
    expect(screen.queryByRole("button", { name: "Dodaj trening" })).toBeNull();
  });

  it("kroki z 7 dni (bez dni bez kroków); sen i tętno nie są tu pokazywane", () => {
    h.days = [day("2026-10-30", 9000), day("2026-10-29", null)];
    render(<HealthActivitySection />);
    const table = screen.getByRole("table", { name: "Kroki z ostatnich 7 dni" });
    expect(table).toHaveTextContent(formatSteps(9000));
    expect(table).not.toHaveTextContent("2026-10-29");
    expect(table).not.toHaveTextContent(formatMinutes(431));
    expect(screen.queryByText(/Tętno spocz/)).toBeNull();
    expect(screen.getByRole("link", { name: "Zdrowie" })).toHaveAttribute("href", "/health");
  });

  it("lista treningów z dystansem, energią i oznaczeniem wpisów ręcznych", () => {
    h.workouts = [workout(), workout({ id: "w2", activity: "Joga", source: "manual", distance_km: null })];
    render(<HealthActivitySection />);
    const list = screen.getByRole("list", { name: "Treningi" });
    expect(list).toHaveTextContent("6,25 km");
    expect(list).toHaveTextContent("400 kcal");
    expect(screen.getAllByText("ręcznie")).toHaveLength(1);
  });

  it("dodanie własnego treningu: formularz, zapis wiersza z źródłem „manual”, komunikat i zamknięcie", async () => {
    render(<HealthActivitySection />);
    fireEvent.click(screen.getByRole("button", { name: "Dodaj trening" }));
    fireEvent.change(screen.getByLabelText("Rodzaj treningu:"), { target: { value: "Bieg" } });
    fireEvent.change(screen.getByLabelText("Godzina rozpoczęcia:"), { target: { value: "07:10" } });
    fireEvent.change(screen.getByLabelText("Czas trwania (min):"), { target: { value: "45" } });
    fireEvent.submit(screen.getByRole("form", { name: "Dodaj trening" }));
    await waitFor(() => expect(h.addWorkout).toHaveBeenCalledTimes(1));
    expect(h.addWorkout).toHaveBeenCalledWith(
      expect.objectContaining({ activity: "Bieg", duration_minutes: 45, source: "manual" })
    );
    await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith("Dodano trening."));
    expect(screen.queryByRole("form", { name: "Dodaj trening" })).toBeNull();
  });

  it.each([
    ["23505", "Taki trening już istnieje (ten sam rodzaj i godzina rozpoczęcia)."],
    ["42501", "Brak zgody lub uprawnień do zapisu treningu."],
    ["inny", "Nie udało się dodać treningu."],
  ])("błąd zapisu (kod %s): czytelny komunikat, formularz zostaje otwarty", async (code, message) => {
    h.addWorkout.mockRejectedValue({ code });
    render(<HealthActivitySection />);
    fireEvent.click(screen.getByRole("button", { name: "Dodaj trening" }));
    fireEvent.change(screen.getByLabelText("Rodzaj treningu:"), { target: { value: "Bieg" } });
    fireEvent.change(screen.getByLabelText("Godzina rozpoczęcia:"), { target: { value: "07:10" } });
    fireEvent.change(screen.getByLabelText("Czas trwania (min):"), { target: { value: "45" } });
    fireEvent.submit(screen.getByRole("form", { name: "Dodaj trening" }));
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith(message, expect.anything()));
    expect(screen.getByRole("form", { name: "Dodaj trening" })).toBeInTheDocument();
  });

  it("usuwanie treningu wymaga potwierdzenia", async () => {
    h.workouts = [workout()];
    render(<HealthActivitySection />);
    h.toast.confirm.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole("button", { name: "Usuń trening Bieg" }));
    await waitFor(() => expect(h.toast.confirm).toHaveBeenCalled());
    expect(h.removeWorkout).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Usuń trening Bieg" }));
    await waitFor(() => expect(h.removeWorkout).toHaveBeenCalledWith("w1"));
    expect(h.toast.success).toHaveBeenCalledWith("Usunięto trening.");
  });
});

describe("formatowanie", () => {
  it("minuty", () => {
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(120)).toBe("2 h");
    expect(formatMinutes(431)).toBe("7 h 11 min");
  });
});
