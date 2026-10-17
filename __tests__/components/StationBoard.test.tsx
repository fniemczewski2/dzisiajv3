// __tests__/components/StationBoard.test.tsx

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/hooks/db/useTrains", () => ({ useTrains: () => ({ addTrain: vi.fn() }) }));
vi.mock("@/hooks/useResponsive", () => ({ useResponsive: () => false }));

import StationBoardWidget from "@/components/transport/StationBoard";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ station: "Poznań Główny", items: [] }), { status: 200 }))
  );
});

describe("tablica stacji", () => {
  it("dodanie stacji od razu pobiera tablicę (bez wiecznego ładowania)", async () => {
    render(<StationBoardWidget />);
    fireEvent.change(screen.getByPlaceholderText("Poznań Główny"), { target: { value: "Poznań Główny" } });
    fireEvent.submit(screen.getByPlaceholderText("Poznań Główny").closest("form")!);

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      "/api/transport/station-board?stationName=Pozna%C5%84%20G%C5%82%C3%B3wny",
      expect.objectContaining({ signal: expect.anything() })
    ));
    await waitFor(() => expect(screen.queryByText(/Aktualizuję/)).toBeNull());
  });

  it("tej samej stacji nie dodaje drugi raz", async () => {
    localStorage.setItem("tracked_station_boards", JSON.stringify(["Poznań Główny"]));
    render(<StationBoardWidget />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByPlaceholderText("Poznań Główny"), { target: { value: "poznań główny" } });
    fireEvent.submit(screen.getByPlaceholderText("Poznań Główny").closest("form")!);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
