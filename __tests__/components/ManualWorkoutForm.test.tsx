// __tests__/components/ManualWorkoutForm.test.tsx

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), confirm: vi.fn(async () => true) }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ toast }) }));

import ManualWorkoutForm from "@/components/training/ManualWorkoutForm";

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

const submit = () => fireEvent.submit(screen.getByRole("form", { name: "Dodaj trening" }));

beforeEach(() => {
  Object.values(toast).forEach((fn) => fn.mockClear());
});

describe("ManualWorkoutForm", () => {
  it("domyślna data jest ustawiona, pozostałe pola puste", () => {
    render(<ManualWorkoutForm date="2026-11-02" saving={false} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Data:")).toHaveValue("2026-11-02");
    expect(screen.getByLabelText("Rodzaj treningu:")).toHaveValue("");
  });

  it("poprawny formularz przekazuje gotowy wiersz (czas UTC, koniec z czasu trwania, źródło „manual”)", async () => {
    const onSubmit = vi.fn(async () => undefined);
    render(<ManualWorkoutForm date="2026-11-02" saving={false} onSubmit={onSubmit} onCancel={vi.fn()} />);
    fill("Rodzaj treningu:", "Bieg");
    fill("Godzina rozpoczęcia:", "07:10");
    fill("Czas trwania (min):", "45");
    fill("Dystans (km, opcjonalnie):", "6,5");
    submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      activity: "Bieg",
      started_at: "2026-11-02T06:10:00.000Z",
      ended_at: "2026-11-02T06:55:00.000Z",
      duration_minutes: 45,
      distance_km: 6.5,
      energy_kcal: null,
      heart_rate_avg: null,
      source: "manual",
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("niepoprawne dane: komunikat i brak zapisu", async () => {
    const onSubmit = vi.fn();
    render(<ManualWorkoutForm date="2026-11-02" saving={false} onSubmit={onSubmit} onCancel={vi.fn()} />);
    submit();
    expect(toast.error).toHaveBeenLastCalledWith("Podaj rodzaj treningu.");
    fill("Rodzaj treningu:", "Bieg");
    fill("Godzina rozpoczęcia:", "07:10");
    fill("Czas trwania (min):", "0");
    submit();
    expect(toast.error).toHaveBeenLastCalledWith("Czas trwania (min): wartość od 1 do 1440.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("podczas zapisu pola są zablokowane", () => {
    render(<ManualWorkoutForm date="2026-11-02" saving={true} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Rodzaj treningu:")).toBeDisabled();
    expect(screen.getByLabelText("Czas trwania (min):")).toBeDisabled();
  });
});
