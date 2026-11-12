// __tests__/components/MeetingPollBookings.test.tsx
//
// Widok organizatora ankiety zapisów: grupowanie według slotów, usuwanie zapisu, eksport CSV.

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { MeetingPoll, MeetingPollBooking } from "@/types/meetingPolls";

const h = vi.hoisted(() => ({
  bookings: [] as unknown[],
  loading: false,
  error: null as unknown,
  deleteBooking: vi.fn(async (_id: string) => undefined),
  confirm: vi.fn(async (_msg: string) => true),
  download: vi.fn(),
}));

vi.mock("@/hooks/db/useMeetingPollBookings", () => ({
  useMeetingPollBookings: () => ({
    bookings: h.bookings,
    loading: h.loading,
    error: h.error,
    deleteBooking: h.deleteBooking,
    deleting: false,
  }),
}));
vi.mock("@/hooks/useIsClient", () => ({ useOrigin: () => "https://www.dzisiaj.fun" }));
vi.mock("@/providers/ToastProvider", () => ({
  useToast: () => ({ toast: { confirm: h.confirm, success: vi.fn(), error: vi.fn() } }),
}));
vi.mock("@/lib/letterArchive", async (orig) => ({
  ...(await orig<typeof import("@/lib/letterArchive")>()),
  downloadBlob: (blob: Blob, name: string) => h.download(blob, name),
}));

import MeetingPollBookings from "@/components/meetingPolls/MeetingPollBookings";

const poll: MeetingPoll = {
  id: "p1",
  user_id: "u",
  title: "Warsztaty: wiosna",
  description: null,
  slot_duration_minutes: 30,
  time_start: "10:00:00",
  time_end: "12:00:00",
  share_token: "tok-1",
  status: "open",
  created_at: "2026-11-01T10:00:00Z",
  updated_at: "2026-11-01T10:00:00Z",
  closes_at: null,
  show_results_to_respondents: false,
  mode: "signup",
  slot_capacity: 3,
  max_slots_per_person: 2,
};

const booking = (over: Partial<MeetingPollBooking>): MeetingPollBooking => ({
  id: "b1",
  poll_id: "p1",
  date: "2026-12-01",
  start_time: "10:00:00",
  name: "Anna Nowak",
  email: "anna@x.pl",
  consent_at: "2026-11-05T10:00:00Z",
  created_at: "2026-11-05T10:00:00Z",
  ...over,
});

beforeEach(() => {
  h.bookings = [
    booking({}),
    booking({ id: "b2", name: "Bartek", email: null, created_at: "2026-11-05T11:00:00Z" }),
    booking({ id: "b3", start_time: "10:30:00", name: "Anna Nowak" }),
  ];
  h.loading = false;
  h.error = null;
  h.deleteBooking.mockClear();
  h.confirm.mockReset().mockResolvedValue(true);
  h.download.mockClear();
});

describe("MeetingPollBookings", () => {
  it("podsumowanie, link do udostępnienia i zapisy pogrupowane według slotów z zajętością", () => {
    render(<MeetingPollBookings poll={poll} />);
    expect(screen.getByRole("heading", { level: 1, name: "Warsztaty: wiosna" })).toBeInTheDocument();
    expect(screen.getByText(/3 miejsc w slocie, do 2 na osobę/)).toBeInTheDocument();
    expect(screen.getByText("Zajętych miejsc: 3")).toBeInTheDocument();
    expect(screen.getByText("Zapisanych osób: 2")).toBeInTheDocument();
    expect(screen.getByText("https://www.dzisiaj.fun/meet/tok-1")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /10:00-10:30.*\(2\/3\)/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /10:30-11:00.*\(1\/3\)/ })).toBeInTheDocument();
    expect(screen.getAllByText("anna@x.pl")).toHaveLength(2);
    expect(screen.getByText("Bartek")).toBeInTheDocument();
  });

  it("usunięcie zapisu wymaga potwierdzenia; po odmowie nic się nie dzieje", async () => {
    render(<MeetingPollBookings poll={poll} />);
    h.confirm.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole("button", { name: "Usuń zapis Bartek" }));
    await waitFor(() => expect(h.confirm).toHaveBeenCalledTimes(1));
    expect(h.deleteBooking).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Usuń zapis Bartek" }));
    await waitFor(() => expect(h.deleteBooking).toHaveBeenCalledWith("b2"));
    expect(h.confirm).toHaveBeenLastCalledWith(expect.stringContaining("Bartek"));
  });

  it("eksport CSV pobiera plik z nazwą opartą na tytule (bez znaków niedozwolonych)", () => {
    render(<MeetingPollBookings poll={poll} />);
    fireEvent.click(screen.getByRole("button", { name: "Pobierz plik .csv" }));
    expect(h.download).toHaveBeenCalledTimes(1);
    const [blob, name] = h.download.mock.calls[0] as [Blob, string];
    expect(name).toBe("zapisy-Warsztaty_ wiosna.csv");
    expect(blob.type).toBe("text/csv;charset=utf-8");
    expect(blob.size).toBeGreaterThan(50);
  });

  it("bez zapisów: komunikat i brak przycisku eksportu", () => {
    h.bookings = [];
    render(<MeetingPollBookings poll={poll} />);
    expect(screen.getByText(/Nikt jeszcze się nie zapisał/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pobierz plik .csv" })).toBeNull();
  });

  it("błąd pobrania zapisów jest widoczny", () => {
    h.bookings = [];
    h.error = new Error("x");
    render(<MeetingPollBookings poll={poll} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Nie udało się pobrać zapisów");
  });
});
