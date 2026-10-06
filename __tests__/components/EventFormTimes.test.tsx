// __tests__/components/EventFormTimes.test.tsx
//
// Ułatwione dodawanie wydarzeń: domyślnie 1 h, „Do” podąża za „Od”,
// szybkie opcje 30 min / 1 h / 2 h.

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const supabase = {
  from: () => ({ select: () => ({ eq: () => ({ neq: () => Promise.resolve({ data: [] }) }) }) }),
  auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
};
vi.mock("@/lib/supabase/client", () => ({ createClient: () => supabase }));
vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
vi.mock("@/hooks/db/useSettings", () => ({ useSettings: () => ({ settings: { users: [] } }) }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }) }));

import EventForm from "@/components/calendar/EventForm";

// Dzień inny niż dziś → domyślny start 9:00 (deterministyczny test).
const DAY = new Date(2030, 4, 15);

function setup() {
  render(
    <EventForm addEvent={vi.fn()} onEventsChange={vi.fn()} currentDate={DAY} selectedDate={DAY} loading={false} />
  );
  const start = () => screen.getByLabelText("Początek:") as HTMLInputElement;
  const end = () => screen.getByLabelText("Koniec:") as HTMLInputElement;
  const chip = (name: string) => screen.getByRole("button", { name });
  return { start, end, chip };
}

function timed() {
  const ui = setup();
  fireEvent.click(screen.getByLabelText("Wydarzenie całodniowe"));
  return ui;
}

describe("EventForm – godziny wydarzenia", () => {
  it("wydarzenie nie-całodniowe domyślnie trwa godzinę", () => {
    const { start, end, chip } = timed();
    expect(start().value).toBe("2030-05-15T09:00");
    expect(end().value).toBe("2030-05-15T10:00");
    expect(chip("1 h").getAttribute("aria-pressed")).toBe("true");
  });

  it("zmiana „Od” ustawia „Do” na +1 h", () => {
    const { start, end } = timed();
    fireEvent.change(start(), { target: { value: "2030-05-15T14:30" } });
    expect(end().value).toBe("2030-05-15T15:30");
  });

  it("„Do” przechodzi na następny dzień po północy", () => {
    const { start, end } = timed();
    fireEvent.change(start(), { target: { value: "2030-05-15T23:30" } });
    expect(end().value).toBe("2030-05-16T00:30");
  });

  it("szybkie opcje 30 min i 2 h ustawiają koniec", () => {
    const { start, end, chip } = timed();
    fireEvent.click(chip("30 min"));
    expect(end().value).toBe("2030-05-15T09:30");
    expect(chip("30 min").getAttribute("aria-pressed")).toBe("true");
    expect(chip("1 h").getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(chip("2 h"));
    expect(end().value).toBe("2030-05-15T11:00");
    // Wybrana długość zostaje przy zmianie początku.
    fireEvent.change(start(), { target: { value: "2030-05-15T13:00" } });
    expect(end().value).toBe("2030-05-15T15:00");
  });

  it("ręcznie ustawiony koniec zdejmuje wybór, a kolejna zmiana „Od” wraca do +1 h", () => {
    const { start, end, chip } = timed();
    fireEvent.change(end(), { target: { value: "2030-05-15T12:15" } });
    for (const name of ["30 min", "1 h", "2 h"]) {
      expect(chip(name).getAttribute("aria-pressed")).toBe("false");
    }
    fireEvent.change(start(), { target: { value: "2030-05-15T16:00" } });
    expect(end().value).toBe("2030-05-15T17:00");
  });

  it("ręczny koniec równy szybkiej opcji podświetla ją", () => {
    const { end, chip } = timed();
    fireEvent.change(end(), { target: { value: "2030-05-15T11:00" } });
    expect(chip("2 h").getAttribute("aria-pressed")).toBe("true");
  });

  it("wydarzenie całodniowe: brak szybkich opcji, koniec nie zostaje przed początkiem", () => {
    const { start, end } = setup();
    expect(screen.queryByRole("button", { name: "1 h" })).toBeNull();
    fireEvent.change(start(), { target: { value: "2030-05-20" } });
    expect(end().value).toBe("2030-05-20");
  });
});
