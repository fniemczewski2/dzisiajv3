// __tests__/components/MeetingPollResults.test.tsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MeetingPollResults as ResultsData } from "@/types/meetingPolls";

const DATA: ResultsData = {
  poll: {
    id: "p1", user_id: "u1", title: "Planowanie sprintu", description: "Ustalamy termin", slot_duration_minutes: 30,
    time_start: "10:00:00", time_end: "12:00:00", share_token: "tok123", status: "open",
    created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z", closes_at: "2099-01-01T00:00:00+00:00",
  },
  dates: ["2026-10-05", "2026-10-06"],
  responses: [
    { id: "r1", respondent_name: "Anna Nowak", respondent_email: "anna@firma.pl", user_id: null, created_at: "2026-10-02T08:00:00Z" },
    { id: "r2", respondent_name: "Bartek", respondent_email: null, user_id: "u2", created_at: "2026-10-02T09:00:00Z" },
  ],
  availabilities: [
    { response_id: "r1", date: "2026-10-05", start_time: "10:00" },
    { response_id: "r1", date: "2026-10-05", start_time: "10:30" },
    { response_id: "r1", date: "2026-10-05", start_time: "11:00" },
    { response_id: "r2", date: "2026-10-05", start_time: "10:30" },
    { response_id: "r2", date: "2026-10-05", start_time: "11:00" },
    { response_id: "r2", date: "2026-10-06", start_time: "10:00" },
  ],
};

let current: ResultsData = DATA;

const stable = vi.hoisted(() => ({
  getPollResults: vi.fn(),
  finalizePoll: vi.fn(),
  auth: { user: null, supabase: {} },
  toast: { toast: { success: vi.fn(), error: vi.fn() } },
}));

vi.mock("@/hooks/db/useMeetingPolls", () => ({
  useMeetingPolls: () => ({ getPollResults: stable.getPollResults, finalizePoll: stable.finalizePoll }),
}));
vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => stable.auth }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => stable.toast }));

import MeetingPollResults from "@/components/meetingPolls/MeetingPollResults";

beforeEach(() => {
  current = DATA;
  stable.getPollResults.mockImplementation(() => Promise.resolve(current));
});

describe("MeetingPollResults", () => {
  it("pokazuje nagłówek, statystyki i najlepsze terminy", async () => {
    render(<MeetingPollResults pollId="p1" />);

    expect(await screen.findByRole("heading", { level: 1, name: "Planowanie sprintu" })).toBeInTheDocument();
    expect(screen.getByText("Przyjmuje odpowiedzi")).toBeInTheDocument();
    expect(screen.getByText("2 odpowiedzi")).toBeInTheDocument();
    expect(screen.getByText("Ustalamy termin")).toBeInTheDocument();

    const best = screen.getByRole("region", { name: "Najlepsze terminy" });
    expect(within(best).getByRole("button", { name: /pon\. 05\.10 · 10:30–11:30/ })).toBeInTheDocument();
    expect(within(best).getByText(/Najwięcej osób naraz: 2 z 2|dostępni są wszyscy/)).toBeInTheDocument();
  });

  it("po wybraniu osoby pokazuje wyłącznie jej dostępność", async () => {
    const user = userEvent.setup();
    render(<MeetingPollResults pollId="p1" />);
    await screen.findByRole("heading", { level: 1 });

    const switcher = screen.getByRole("group", { name: "Czyja dostępność?" });
    await user.click(within(switcher).getByRole("button", { name: /Anna Nowak/ }));

    const summary = screen.getByRole("region", { name: "Anna Nowak" });
    expect(within(summary).getByText("1 h 30 min")).toBeInTheDocument();
    expect(within(summary).getByText("1 z 2")).toBeInTheDocument();
    expect(within(summary).getByText("10:00–11:30")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /2026-10-05 10:00: Anna Nowak: dostępność zaznaczona/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2026-10-06 10:00: Anna Nowak: brak zaznaczenia/ })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Najlepsze terminy" })).not.toBeInTheDocument();
  });

  it("wraca do widoku wszystkich przyciskiem „Pokaż wszystkich”", async () => {
    const user = userEvent.setup();
    render(<MeetingPollResults pollId="p1" />);
    await screen.findByRole("heading", { level: 1 });

    await user.click(within(screen.getByRole("group", { name: "Czyja dostępność?" })).getByRole("button", { name: /Bartek/ }));
    const summary = screen.getByRole("region", { name: "Bartek" });
    await user.click(within(summary).getByRole("button", { name: "Pokaż wszystkich" }));

    expect(screen.queryByRole("region", { name: "Bartek" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Najlepsze terminy" })).toBeInTheDocument();
  });

  it("przycisk „Zobacz dostępność” na liście uczestników przełącza tę samą osobę", async () => {
    const user = userEvent.setup();
    render(<MeetingPollResults pollId="p1" />);
    await screen.findByRole("heading", { level: 1 });

    const list = screen.getByRole("region", { name: /Uczestnicy/ });
    const buttons = within(list).getAllByRole("button", { name: "Zobacz dostępność" });
    await user.click(buttons[1]);

    expect(screen.getByRole("region", { name: "Bartek" })).toBeInTheDocument();
    expect(within(list).getByRole("button", { name: "Pokaż wszystkich", pressed: true })).toBeInTheDocument();
  });

  it("wybór najlepszego terminu otwiera panel z dostępnymi osobami", async () => {
    const user = userEvent.setup();
    render(<MeetingPollResults pollId="p1" />);
    await screen.findByRole("heading", { level: 1 });

    await user.click(screen.getByRole("button", { name: /pon\. 05\.10 · 10:30–11:30/ }));

    const panel = screen.getByRole("region", { name: "Wybrany termin" });
    expect(within(panel).getByText(/10:30–11:30/)).toBeInTheDocument();
    expect(within(panel).getByText("Anna Nowak")).toBeInTheDocument();
    expect(within(panel).getByText("Bartek")).toBeInTheDocument();
    expect(within(panel).getByLabelText("Tytuł wydarzenia:")).toHaveValue("Planowanie sprintu");
    expect(within(panel).queryByLabelText("Opis:")).not.toBeInTheDocument();
  });

  it("bez odpowiedzi pokazuje link do udostępnienia", async () => {
    current = { ...DATA, responses: [], availabilities: [] };
    render(<MeetingPollResults pollId="p1" />);

    expect(await screen.findByText(/Wyślij uczestnikom link do ankiety/)).toBeInTheDocument();
    expect(screen.getByText(/\/meet\/tok123$/)).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Czyja dostępność?" })).not.toBeInTheDocument();
  });
});
