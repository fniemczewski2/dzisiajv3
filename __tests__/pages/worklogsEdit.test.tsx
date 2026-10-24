// __tests__/pages/worklogsEdit.test.tsx
//
// Edycja wpisu czasu pracy: formularz wypełniony danymi wpisu, zapis przez hook,
// wpis trwający (bez końca) i odrzucenie zakresu, w którym koniec jest przed początkiem.

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { toIsoWithLocalOffset } from "@/lib/workLogTime";

const editWorkLog = vi.fn();
const addWorkLog = vi.fn();
const deleteWorkLog = vi.fn();
const toastError = vi.fn();
let logs: unknown[] = [];

vi.mock("@/hooks/db/useWorkLogs", () => ({
  useWorkLogs: () => ({ workLogs: logs, loading: false, addWorkLog, editWorkLog, deleteWorkLog }),
}));
vi.mock("@/providers/ToastProvider", () => ({
  useToast: () => ({
    toast: { error: toastError, success: vi.fn(), info: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
  }),
}));
vi.mock("@/hooks/useNow", () => ({ useNow: () => new Date("2026-10-24T12:00:00") }));
vi.mock("@/components/ui/SEO", () => ({ default: () => null }));

import WorkLogsPage from "@/pages/worklogs";

const START = toIsoWithLocalOffset("2026-10-24T10:00");
const END = toIsoWithLocalOffset("2026-10-24T11:30");
const baseLog = { id: "w1", user_id: "u1", description: "Kodowanie", start_time: START, end_time: END };

function input(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement;
}

beforeEach(() => {
  editWorkLog.mockReset().mockResolvedValue({ id: "w1" });
  addWorkLog.mockReset();
  deleteWorkLog.mockReset();
  toastError.mockReset();
  logs = [baseLog];
});

describe("edycja wpisu czasu pracy", () => {
  it("otwiera formularz z danymi wpisu", () => {
    render(<WorkLogsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Edytuj wpis: Kodowanie" }));
    expect(screen.getByRole("form", { name: "Edycja czasu pracy" })).toBeInTheDocument();
    expect(input("desc").value).toBe("Kodowanie");
    expect(input("time-start").value).toBe("2026-10-24T10:00");
    expect(input("time-end").value).toBe("2026-10-24T11:30");
  });

  it("zapisuje zmiany przez hook z tym samym id", async () => {
    render(<WorkLogsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Edytuj wpis: Kodowanie" }));
    fireEvent.change(input("desc"), { target: { value: "Przegląd kodu" } });
    fireEvent.change(input("time-end"), { target: { value: "2026-10-24T12:00" } });
    fireEvent.submit(screen.getByRole("form", { name: "Edycja czasu pracy" }));

    await waitFor(() => expect(editWorkLog).toHaveBeenCalledTimes(1));
    expect(editWorkLog).toHaveBeenCalledWith("w1", {
      description: "Przegląd kodu",
      start_time: START,
      end_time: toIsoWithLocalOffset("2026-10-24T12:00"),
    });
    expect(addWorkLog).not.toHaveBeenCalled();
  });

  it("wyczyszczony koniec zapisuje wpis jako trwający (end_time = null)", async () => {
    render(<WorkLogsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Edytuj wpis: Kodowanie" }));
    fireEvent.change(input("time-end"), { target: { value: "" } });
    fireEvent.submit(screen.getByRole("form", { name: "Edycja czasu pracy" }));

    await waitFor(() => expect(editWorkLog).toHaveBeenCalled());
    expect(editWorkLog.mock.calls[0][1]).toMatchObject({ end_time: null });
  });

  it("koniec przed początkiem nie wysyła zmian i pokazuje komunikat", async () => {
    render(<WorkLogsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Edytuj wpis: Kodowanie" }));
    fireEvent.change(input("time-end"), { target: { value: "2026-10-24T09:00" } });
    fireEvent.submit(screen.getByRole("form", { name: "Edycja czasu pracy" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/późniejszy/)));
    expect(editWorkLog).not.toHaveBeenCalled();
  });

  it("w trakcie edycji nie pokazuje przycisku dodawania", () => {
    render(<WorkLogsPage />);
    expect(screen.getByRole("button", { name: /Dodaj/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edytuj wpis: Kodowanie" }));
    expect(screen.queryByRole("button", { name: /Dodaj/ })).toBeNull();
  });
});
