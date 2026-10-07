// __tests__/pages/trainsPage.test.tsx
//
// Rozkłady stacji i bilety wydzielone na stronę /trains; /transport to już
// tylko komunikacja miejska.

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const addTrain = vi.fn();
const stationBoardProps: Record<string, unknown>[] = [];

vi.mock("@/components/ui/SEO", () => ({ default: () => null }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ toast: { error: vi.fn(), success: vi.fn() } }) }));
vi.mock("@/hooks/db/useTrains", () => ({
  useTrains: () => ({
    trains: [{ id: "t1", trainNumber: "IC 3806" }],
    addTrain,
    deleteTrain: vi.fn(),
    refresh: () => Promise.resolve(),
    fetching: false,
  }),
}));
vi.mock("@/components/transport/StationBoard", () => ({
  default: (props: Record<string, unknown>) => {
    stationBoardProps.push(props);
    return <section>Tablice stacji</section>;
  },
}));
vi.mock("@/components/transport/AddTrainWidget", () => ({ default: () => <div>Formularz biletu</div> }));
vi.mock("@/components/transport/TrackedTrainCard", () => ({
  TrackedTrainCard: ({ train }: { train: { trainNumber: string } }) => <article>{train.trainNumber}</article>,
}));
vi.mock("@/hooks/db/useTransport", () => ({
  useTransport: () => ({
    nearbyGroups: [], favoritesGroups: [], locationError: null, searchQuery: "", setSearchQuery: vi.fn(),
    suggestions: [], handleSuggestionClick: vi.fn(), favoriteStops: [], addNearbyToFavorites: vi.fn(),
    removeFavoriteStop: vi.fn(), localityFor: () => null, loadingNearby: false, loadingFavorites: false, transportError: null,
  }),
}));

import TrainsPage from "@/pages/trains";
import TransportPage from "@/pages/transport";

describe("strona /trains", () => {
  it("pokazuje Twoje pociągi, formularz biletu i tablice stacji", () => {
    render(<TrainsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Pociągi" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Twoje pociągi" })).toBeTruthy();
    expect(screen.getByText("Formularz biletu")).toBeTruthy();
    expect(screen.getByText("IC 3806")).toBeTruthy();
    expect(screen.getByText("Tablice stacji")).toBeTruthy();
  });

  it("tablica stacji dodaje pociąg tą samą funkcją co lista na stronie", () => {
    render(<TrainsPage />);
    expect(stationBoardProps.at(-1)?.onTrainAdded).toBe(addTrain);
  });
});

describe("strona /transport", () => {
  it("to już tylko komunikacja miejska – bez pociągów i tablic stacji", () => {
    render(<TransportPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Komunikacja miejska" })).toBeTruthy();
    expect(screen.queryByText("Tablice stacji")).toBeNull();
    expect(screen.queryByText("Formularz biletu")).toBeNull();
    expect(screen.queryByText(/Twoje pociągi/)).toBeNull();
  });
});
