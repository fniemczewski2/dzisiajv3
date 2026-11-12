// __tests__/components/PublicSignupForm.test.tsx
//
// Publiczny formularz zapisów (z prawdziwym hookiem i atrapą fetch): siatka slotów, limity, zgoda, błędy serwera.

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PublicSignupForm from "@/components/meetingPolls/PublicSignupForm";
import type { PublicMeetingPoll, PublicSignupSlots } from "@/types/meetingPolls";

const poll = (over: Partial<PublicMeetingPoll> = {}): PublicMeetingPoll => ({
  title: "Warsztaty",
  description: "Opis warsztatów",
  slot_duration_minutes: 30,
  time_start: "10:00:00",
  time_end: "11:00:00",
  dates: ["2026-12-01"],
  status: "open",
  show_results_to_respondents: false,
  mode: "signup",
  slot_capacity: 2,
  max_slots_per_person: 1,
  ...over,
});

let slotsResponse: PublicSignupSlots;
let bookResponse: { status: number; body: Record<string, unknown> };
const calls: { url: string; init?: RequestInit }[] = [];

function renderForm(p = poll()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PublicSignupForm token="tok" poll={p} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  calls.length = 0;
  slotsResponse = { capacity: 2, max_per_person: 1, slots: [{ date: "2026-12-01", start_time: "10:00", booked: 2 }] };
  bookResponse = { status: 200, body: { booked: 1 } };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.endsWith("/slots")) return { ok: true, status: 200, json: async () => slotsResponse };
      return { ok: bookResponse.status < 400, status: bookResponse.status, json: async () => bookResponse.body };
    })
  );
});
afterEach(() => vi.unstubAllGlobals());

const slotButton = (re: RegExp) => screen.getByRole("button", { name: re });

describe("PublicSignupForm", () => {
  it("pokazuje sloty z liczbą wolnych miejsc; slot bez miejsc jest wyłączony", async () => {
    renderForm();
    expect(await screen.findByText("Warsztaty")).toBeInTheDocument();
    expect(slotButton(/10:00-10:30.*brak wolnych miejsc/)).toBeDisabled();
    expect(slotButton(/10:30-11:00.*wolnych miejsc: 2 z 2/)).toBeEnabled();
    expect(screen.getByText("zajęty")).toBeInTheDocument();
    expect(screen.getByText(/jeden termin/)).toBeInTheDocument();
  });

  it("limit terminów na osobę: po osiągnięciu limitu pozostałe sloty są wyłączone, odznaczenie je odblokowuje", async () => {
    slotsResponse = { capacity: 2, max_per_person: 1, slots: [] };
    renderForm();
    const first = await screen.findByRole("button", { name: /10:00-10:30/ });
    const second = slotButton(/10:30-11:00/);
    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-pressed", "true");
    expect(second).toBeDisabled();
    expect(screen.getByText("Wybrano: 1 z 1")).toBeInTheDocument();
    fireEvent.click(first);
    expect(second).toBeEnabled();
  });

  it("wysłanie wymaga terminu, imienia i zgody; żądanie zawiera dane, zgodę i puste pole pułapki", async () => {
    slotsResponse = { capacity: 2, max_per_person: 1, slots: [] };
    renderForm();
    const submit = await screen.findByRole("button", { name: /Zapisz/ });
    expect(submit).toBeDisabled();
    fireEvent.click(slotButton(/10:30-11:00/));
    fireEvent.change(screen.getByLabelText("Imię i nazwisko:"), { target: { value: "Anna Nowak" } });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText("E-mail (opcjonalnie):"), { target: { value: "anna@x.pl" } });
    fireEvent.click(screen.getByRole("checkbox"));
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    expect(await screen.findByText("Zapisano!")).toBeInTheDocument();
    const post = calls.find((c) => c.url.endsWith("/book"));
    expect(post?.init?.method).toBe("POST");
    expect(JSON.parse(post?.init?.body as string)).toEqual({
      name: "Anna Nowak",
      email: "anna@x.pl",
      slots: [{ date: "2026-12-01", start_time: "10:30" }],
      consent: true,
      website: "",
    });
    expect(screen.getByText(/2026-12-01 10:30/)).toBeInTheDocument();
  });

  it("e-mail pusty → null w żądaniu; link do informacji o danych jest obecny", async () => {
    slotsResponse = { capacity: 2, max_per_person: 1, slots: [] };
    renderForm();
    await screen.findByRole("button", { name: /Zapisz/ });
    fireEvent.click(slotButton(/10:00-10:30/));
    fireEvent.change(screen.getByLabelText("Imię i nazwisko:"), { target: { value: "Bartek" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Zapisz/ }));
    await screen.findByText("Zapisano!");
    expect(JSON.parse(calls.find((c) => c.url.endsWith("/book"))?.init?.body as string).email).toBeNull();
  });

  it("błąd serwera jest pokazany uczestnikowi; „termin zajęty” czyści wybór i odświeża zajętość", async () => {
    slotsResponse = { capacity: 2, max_per_person: 1, slots: [] };
    bookResponse = {
      status: 409,
      body: { error: "Termin 2026-12-01 10:30 został już zajęty. Wybierz inny.", code: "full" },
    };
    renderForm();
    await screen.findByRole("button", { name: /Zapisz/ });
    fireEvent.click(slotButton(/10:30-11:00/));
    fireEvent.change(screen.getByLabelText("Imię i nazwisko:"), { target: { value: "Anna" } });
    fireEvent.click(screen.getByRole("checkbox"));
    const before = calls.filter((c) => c.url.endsWith("/slots")).length;
    fireEvent.click(screen.getByRole("button", { name: /Zapisz/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("został już zajęty");
    await waitFor(() => expect(calls.filter((c) => c.url.endsWith("/slots")).length).toBeGreaterThan(before));
    expect(screen.getByText("Wybrano: 0 z 1")).toBeInTheDocument();
    expect(screen.queryByText("Zapisano!")).toBeNull();
  });

  it("limit większy niż 1: można wybrać kilka terminów aż do limitu", async () => {
    slotsResponse = { capacity: 2, max_per_person: 2, slots: [] };
    renderForm(poll({ max_slots_per_person: 2 }));
    await screen.findByRole("button", { name: /Zapisz/ });
    fireEvent.click(slotButton(/10:00-10:30/));
    fireEvent.click(slotButton(/10:30-11:00/));
    expect(screen.getByText("Wybrano: 2 z 2")).toBeInTheDocument();
    expect(screen.getByText(/do 2 terminów/)).toBeInTheDocument();
  });

  it("niepowodzenie wczytania zajętości: komunikat zamiast formularza", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }))
    );
    renderForm();
    expect(await screen.findByText(/Nie udało się wczytać terminów/)).toBeInTheDocument();
  });
});
