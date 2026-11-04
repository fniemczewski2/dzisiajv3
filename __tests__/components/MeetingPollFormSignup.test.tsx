// __tests__/components/MeetingPollFormSignup.test.tsx
//
// Formularz tworzenia ankiety: wybór rodzaju (dostępność / zapisy), pojemność slotu i limit na osobę.

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ createPoll: vi.fn(async (_p: unknown) => ({ id: "new" })) }));
vi.mock("@/hooks/db/useMeetingPolls", () => ({
  useMeetingPolls: () => ({ createPoll: h.createPoll, loading: false }),
}));

import MeetingPollForm from "@/components/meetingPolls/MeetingPollForm";

beforeEach(() => h.createPoll.mockClear());

function fillBasics() {
  fireEvent.change(screen.getByLabelText("Nazwa spotkania:"), { target: { value: "Warsztaty" } });
  fireEvent.click(screen.getByRole("button", { name: /Najbliższe .* dni robocze/ }));
}

describe("MeetingPollForm – rodzaj ankiety", () => {
  it("domyślnie ankieta dostępności: bez pól zapisów, zachowanie bez zmian", async () => {
    const onChange = vi.fn();
    render(<MeetingPollForm onChange={onChange} />);
    expect(screen.queryByLabelText("Miejsc w jednym terminie:")).toBeNull();
    fillBasics();
    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));
    await waitFor(() => expect(h.createPoll).toHaveBeenCalledTimes(1));
    expect(h.createPoll).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "availability", slot_capacity: 1, max_slots_per_person: 1 })
    );
    await waitFor(() => expect(onChange).toHaveBeenCalled());
  });

  it("zapisy: pojawiają się pola pojemności i limitu, ukryte „pokaż wyniki”, wartości trafiają do ankiety", async () => {
    render(<MeetingPollForm onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("radio", { name: /Zapisy na terminy/ }));
    expect(screen.getByRole("heading", { name: "Nowe zapisy na terminy" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Miejsc w jednym terminie:"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Terminów na osobę:"), { target: { value: "2" } });
    fillBasics();
    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));
    await waitFor(() => expect(h.createPoll).toHaveBeenCalledTimes(1));
    expect(h.createPoll).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "signup",
        slot_capacity: 5,
        max_slots_per_person: 2,
        show_results_to_respondents: false,
      })
    );
  });

  it.each([
    ["Miejsc w jednym terminie:", "0"],
    ["Miejsc w jednym terminie:", "501"],
    ["Miejsc w jednym terminie:", "2.5"],
    ["Terminów na osobę:", "0"],
    ["Terminów na osobę:", "51"],
  ])("niepoprawny limit (%s = %s) blokuje zapis", (label, value) => {
    render(<MeetingPollForm onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("radio", { name: /Zapisy na terminy/ }));
    fillBasics();
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    expect(screen.getByRole("button", { name: "Zapisz" })).toBeDisabled();
    expect(h.createPoll).not.toHaveBeenCalled();
  });
});
