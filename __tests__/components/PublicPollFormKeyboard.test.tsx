// __tests__/components/PublicPollFormKeyboard.test.tsx
//
// Siatka dostępności w publicznej ankiecie: każda komórka ma przycisk
// obsługiwany klawiaturą, a stan jest podany nie tylko kolorem (aria-pressed + ✓).

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const submitResponse = vi.fn(() => Promise.resolve(true));
vi.mock("@/hooks/usePublicMeetingPoll", () => ({
  usePublicMeetingPoll: () => ({
    poll: {
      title: "Spotkanie",
      description: null,
      slot_duration_minutes: 60,
      time_start: "09:00",
      time_end: "11:00",
      dates: ["2030-05-15"],
      status: "open",
    },
    loading: false,
    notFound: false,
    submitting: false,
    submitted: false,
    hasExistingResponse: false,
    existingResponse: null,
    submitResponse,
  }),
}));

import PublicPollForm from "@/components/meetingPolls/PublicPollForm";

describe("PublicPollForm – dostęp z klawiatury", () => {
  it("każdy termin to przycisk z czytelną etykietą", () => {
    render(<PublicPollForm token="t" />);
    expect(screen.getByRole("button", { name: "15.05, 09:00" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "15.05, 10:00" })).toBeTruthy();
    expect(screen.getAllByRole("rowheader").map((h) => h.textContent)).toEqual(["09:00", "10:00"]);
  });

  it("Enter/Spacja (kliknięcie bez wskaźnika) zaznacza i odznacza termin", () => {
    render(<PublicPollForm token="t" />);
    const slot = screen.getByRole("button", { name: "15.05, 09:00" });
    expect(slot.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(slot, { detail: 0 });
    expect(slot.getAttribute("aria-pressed")).toBe("true");
    expect(slot.querySelector("svg")).toBeTruthy(); // ✓ – stan nie tylko kolorem

    fireEvent.click(slot, { detail: 0 });
    expect(slot.getAttribute("aria-pressed")).toBe("false");
  });

  it("kliknięcie myszą nie przełącza drugi raz (obsługuje je przeciąganie na komórce)", () => {
    render(<PublicPollForm token="t" />);
    const slot = screen.getByRole("button", { name: "15.05, 09:00" });
    fireEvent.click(slot, { detail: 1 });
    expect(slot.getAttribute("aria-pressed")).toBe("false");
  });
});
