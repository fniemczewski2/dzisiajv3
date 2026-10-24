// __tests__/components/RespondentResultsGrid.test.tsx

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RespondentResultsGrid from "@/components/meetingPolls/RespondentResultsGrid";
import type { PublicMeetingPoll } from "@/types/meetingPolls";

const poll: PublicMeetingPoll = {
  title: "Spotkanie",
  description: null,
  slot_duration_minutes: 60,
  time_start: "09:00",
  time_end: "11:00",
  dates: ["2026-10-27", "2026-10-28"],
  status: "open",
  show_results_to_respondents: true,
};

describe("RespondentResultsGrid", () => {
  it("pokazuje liczbę osób i najlepsze przedziały", () => {
    render(
      <RespondentResultsGrid
        poll={poll}
        results={{
          respondents: 3,
          slots: [
            { date: "2026-10-27", start_time: "10:00", count: 3 },
            { date: "2026-10-28", start_time: "09:00", count: 1 },
          ],
        }}
      />
    );
    expect(screen.getByText("Odpowiedziało: 3 osoby")).toBeInTheDocument();
    expect(screen.getByText("Najwięcej osób (3 z 3):")).toBeInTheDocument();
    expect(screen.getByText(/27\.10, 10:00–11:00/)).toBeInTheDocument();
  });

  it("renderuje wszystkie komórki siatki dni × godziny", () => {
    const { container } = render(<RespondentResultsGrid poll={poll} results={{ respondents: 1, slots: [] }} />);
    expect(screen.getByText("Nikt jeszcze nie zaznaczył terminów.")).toBeInTheDocument();
    expect(container.querySelectorAll("tbody td")).toHaveLength(0);
  });

  it("każda komórka ma tekst dla czytnika z liczbą osób", () => {
    render(
      <RespondentResultsGrid
        poll={poll}
        results={{ respondents: 2, slots: [{ date: "2026-10-27", start_time: "09:00", count: 2 }] }}
      />
    );
    expect(screen.getByText(/2026-10-27, 09:00: 2 z 2 osób/)).toBeInTheDocument();
    expect(screen.getByText(/2026-10-28, 10:00: 0 z 2 osób/)).toBeInTheDocument();
  });

  it("nie zawiera imion ani adresów uczestników", () => {
    const { container } = render(
      <RespondentResultsGrid
        poll={poll}
        results={{ respondents: 1, slots: [{ date: "2026-10-27", start_time: "09:00", count: 1 }] }}
      />
    );
    expect(container.textContent).not.toMatch(/@/);
    expect(container.querySelectorAll("button, a, input")).toHaveLength(0);
  });
});
