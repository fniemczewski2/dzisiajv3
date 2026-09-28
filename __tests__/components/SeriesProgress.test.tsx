// __tests__/components/SeriesProgress.test.tsx

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SeriesProgress from "@/components/movies/SeriesProgress";

describe("SeriesProgress", () => {
  it("advances the episode", async () => {
    const onChange = vi.fn();
    render(<SeriesProgress season={2} episode={3} seasonsCount={4} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Obejrzałem kolejny odcinek" }));
    expect(onChange).toHaveBeenCalledWith(2, 4);
  });

  it("moving to the next season resets the episode", async () => {
    const onChange = vi.fn();
    render(<SeriesProgress season={1} episode={8} seasonsCount={3} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Kolejny sezon/ }));
    expect(onChange).toHaveBeenCalledWith(2, 0);
  });

  it("blocks going past the last known season and below season 1 / episode 0", () => {
    render(<SeriesProgress season={3} episode={0} seasonsCount={3} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Następny sezon" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cofnij odcinek" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Kolejny sezon/ })).toBeNull();
  });

  it("defaults to S1 E0 for a freshly added series", () => {
    render(<SeriesProgress season={null} episode={null} seasonsCount={null} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Poprzedni sezon" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Następny sezon" })).toBeEnabled();
  });
});
