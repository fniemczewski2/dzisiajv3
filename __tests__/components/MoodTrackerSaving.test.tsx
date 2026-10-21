// __tests__/components/MoodTrackerSaving.test.tsx
//
// Zapis wyboru nastroju nie może odmontować widżetu (miganie): ukrywamy go tylko
// przy pierwszym wczytaniu, a w trakcie zapisu ignorujemy kolejne kliknięcia.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const logMood = vi.fn(() => Promise.resolve());
let moodsState = { moods: [] as { date: string; mood_id: string | null }[], loading: false, fetching: false };

vi.mock("@/hooks/db/useSettings", () => ({
  useSettings: () => ({
    settings: {
      show_mood_tracker: true,
      mood_options: null,
      mood_consent_at: "2026-10-01T00:00:00Z",
      mood_consent_version: "current",
    },
    fetching: false,
    updateSettings: vi.fn(),
  }),
}));
vi.mock("@/hooks/useMoodConsent", () => ({ useMoodConsent: () => ({ status: "granted", grant: vi.fn() }) }));
vi.mock("@/hooks/db/useMoods", () => ({ useMoods: () => ({ ...moodsState, logMood }) }));

import MoodWidget from "@/components/widgets/MoodTracker";

beforeEach(() => {
  moodsState = { moods: [], loading: false, fetching: false };
  logMood.mockClear();
});

describe("MoodWidget – zapis wyboru", () => {
  it("pokazuje przyciski nastroju", () => {
    render(<MoodWidget date="2026-10-21" />);
    expect(screen.getAllByRole("button", { name: /^Nastrój:/ }).length).toBeGreaterThan(0);
  });

  it("w trakcie zapisu widżet zostaje na ekranie (bez migania)", () => {
    const { rerender } = render(<MoodWidget date="2026-10-21" />);
    const before = screen.getAllByRole("button", { name: /^Nastrój:/ });
    moodsState = { ...moodsState, loading: true };
    rerender(<MoodWidget date="2026-10-21" />);
    const during = screen.getAllByRole("button", { name: /^Nastrój:/ });
    expect(during).toHaveLength(before.length);
    expect(during[0]).toBe(before[0]); // ten sam węzeł DOM, nie zamontowany od nowa
  });

  it("w trakcie zapisu ignoruje kolejne kliknięcia", () => {
    moodsState = { ...moodsState, loading: true };
    render(<MoodWidget date="2026-10-21" />);
    fireEvent.click(screen.getAllByRole("button", { name: /^Nastrój:/ })[0]);
    expect(logMood).not.toHaveBeenCalled();
  });

  it("zapisuje wybór, gdy nic się nie zapisuje", () => {
    render(<MoodWidget date="2026-10-21" />);
    fireEvent.click(screen.getAllByRole("button", { name: /^Nastrój:/ })[0]);
    expect(logMood).toHaveBeenCalledTimes(1);
  });

  it("przy pierwszym wczytaniu nastrojów nic nie pokazuje", () => {
    moodsState = { ...moodsState, fetching: true };
    const { container } = render(<MoodWidget date="2026-10-21" />);
    expect(container).toBeEmptyDOMElement();
  });
});
