// __tests__/components/EventFormCalendar.test.tsx
//
// Pole „Dodaj do”: wydarzenie powstaje w aplikacji i trafia do wybranego
// kalendarza Google/Outlook. Wcześniej wybór był ignorowany.

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const calendars = [
  { id: "cal-g", calendar_name: "Praca", google_calendar_id: "primary", provider: "google" },
  { id: "cal-o", calendar_name: "Dom", google_calendar_id: "AAMk", provider: "outlook" },
];
const supabase = {
  from: () => ({ select: () => ({ eq: () => ({ neq: () => Promise.resolve({ data: calendars }) }) }) }),
  auth: { getSession: () => Promise.resolve({ data: { session: { access_token: "tok" } } }) },
};
const toast = { success: vi.fn(), error: vi.fn() };
const exportMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({ createClient: () => supabase }));
vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
vi.mock("@/hooks/db/useSettings", () => ({ useSettings: () => ({ settings: { users: [] } }) }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/lib/calendarExport", async (orig) => ({
  ...(await orig<typeof import("@/lib/calendarExport")>()),
  exportEventToCalendar: (...args: unknown[]) => exportMock(...args),
}));

import EventForm from "@/components/calendar/EventForm";

const DAY = new Date(2030, 4, 15);

async function setup() {
  const addEvent = vi.fn(() => Promise.resolve({ id: "ev-123" }));
  render(<EventForm addEvent={addEvent as never} onEventsChange={vi.fn()} currentDate={DAY} selectedDate={DAY} loading={false} />);
  fireEvent.change(screen.getByLabelText("Tytuł wydarzenia:"), { target: { value: "Spotkanie" } });
  await screen.findByRole("option", { name: "Google: Praca" });
  const select = screen.getByLabelText("Dodaj do:") as HTMLSelectElement;
  const submit = () => fireEvent.submit(select.closest("form")!);
  return { addEvent, select, submit };
}

beforeEach(() => {
  exportMock.mockReset();
  toast.success.mockClear();
  toast.error.mockClear();
});

describe("EventForm – pole „Dodaj do”", () => {
  it("wysyła nowe wydarzenie do wybranego kalendarza Google", async () => {
    exportMock.mockResolvedValue(true);
    const { addEvent, select, submit } = await setup();
    fireEvent.change(select, { target: { value: "cal-g" } });
    submit();

    await waitFor(() => expect(exportMock).toHaveBeenCalledTimes(1));
    expect(addEvent).toHaveBeenCalledTimes(1);
    const [target, eventId, token] = exportMock.mock.calls[0];
    expect(target).toMatchObject({ id: "cal-g", provider: "google" });
    expect(eventId).toBe("ev-123");
    expect(token).toBe("tok");
    expect(toast.success).toHaveBeenCalledWith("Dodano też do kalendarza Google: Praca");
  });

  it("kalendarz aplikacji – nic nie wysyła", async () => {
    const { addEvent, submit } = await setup();
    submit();
    await waitFor(() => expect(addEvent).toHaveBeenCalled());
    expect(exportMock).not.toHaveBeenCalled();
  });

  it("nieudane wysłanie: wydarzenie zostaje w aplikacji, użytkownik dostaje komunikat", async () => {
    exportMock.mockResolvedValue(false);
    const { select, submit } = await setup();
    fireEvent.change(select, { target: { value: "cal-o" } });
    submit();
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Wydarzenie zapisano w aplikacji, ale nie udało się dodać go do kalendarza Outlook: Dom."
      )
    );
  });

  it("wydarzenie cykliczne: kalendarze zewnętrzne zablokowane, wybór wraca do aplikacji", async () => {
    const { select } = await setup();
    fireEvent.change(select, { target: { value: "cal-g" } });
    fireEvent.change(screen.getByLabelText("Powtarzaj:"), { target: { value: "weekly" } });

    expect(select.value).toBe("local");
    expect((screen.getByRole("option", { name: "Google: Praca" }) as HTMLOptionElement).disabled).toBe(true);
    expect(screen.getByText("Wydarzenia cykliczne zapisujemy tylko w kalendarzu aplikacji.")).toBeTruthy();
  });
});
