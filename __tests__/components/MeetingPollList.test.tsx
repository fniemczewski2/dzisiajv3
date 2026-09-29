// __tests__/components/MeetingPollList.test.tsx

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { MeetingPoll } from "@/types/meetingPolls";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => <a href={href} {...rest}>{children}</a>,
}));

vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }) }));

const poll = (over: Partial<MeetingPoll>): MeetingPoll => ({
  id: "a", user_id: "u", title: "Retrospektywa", description: null, slot_duration_minutes: 30,
  time_start: "10:00:00", time_end: "16:00:00", share_token: "tok-a", status: "open",
  created_at: "2026-10-03T10:00:00Z", updated_at: "2026-10-03T10:00:00Z", closes_at: "2099-01-01T00:00:00+00:00", ...over,
});

const POLLS = [
  poll({ id: "a", title: "Retrospektywa" }),
  poll({ id: "b", title: "Kickoff", status: "closed", share_token: "tok-b", created_at: "2026-09-01T10:00:00Z" }),
];

const hookValue = vi.hoisted(() => ({ deletePoll: vi.fn(), setPollStatus: vi.fn(), fetchPolls: vi.fn() }));

vi.mock("@/hooks/db/useMeetingPolls", () => ({
  useMeetingPolls: () => ({ polls: POLLS, ...hookValue }),
}));

const table = (rows: { poll_id: string }[]) => ({
  select: () => ({ in: async () => ({ data: rows, error: null }) }),
});
vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    supabase: {
      from: (name: string) =>
        name === "meeting_poll_responses"
          ? table([{ poll_id: "a" }, { poll_id: "a" }, { poll_id: "a" }])
          : table([{ poll_id: "a" }, { poll_id: "a" }, { poll_id: "b" }]),
    },
  }),
}));

import MeetingPollList from "@/components/meetingPolls/MeetingPollList";

describe("MeetingPollList", () => {
  it("dzieli ankiety na otwarte i zamknięte", async () => {
    render(<MeetingPollList />);

    expect(await screen.findByRole("heading", { name: "Otwarte (1)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Zamknięte (1)" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retrospektywa" })).toHaveAttribute("href", "/meetings/a");
  });

  it("pokazuje liczbę odpowiedzi i dni pobraną osobnym zapytaniem", async () => {
    render(<MeetingPollList />);

    const open = await screen.findByRole("region", { name: "Otwarte (1)" });
    expect(await within(open).findByText("3")).toBeInTheDocument();
    expect(within(open).getByText("odpowiedzi")).toBeInTheDocument();
    expect(within(open).getByText("2 dni")).toBeInTheDocument();
  });

  it("zamknięta ankieta oferuje ponowne otwarcie", async () => {
    render(<MeetingPollList />);
    const closed = await screen.findByRole("region", { name: "Zamknięte (1)" });
    expect(within(closed).getByRole("button", { name: "Otwórz ponownie" })).toBeInTheDocument();
    expect(within(closed).getByText("Zamknięta")).toBeInTheDocument();
  });
});
