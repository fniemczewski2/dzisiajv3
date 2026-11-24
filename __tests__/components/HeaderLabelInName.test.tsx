// __tests__/components/HeaderLabelInName.test.tsx
//
// WCAG 2.5.3 (Etykieta w nazwie): nazwa dostępna przycisku musi zawierać jego widoczny tekst,
// inaczej sterowanie głosem nie trafia w element (audyt label-content-name-mismatch).

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/router", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { WeatherDetails } from "@/components/Header";

describe("Header – etykieta w nazwie", () => {
  it("przycisk pogody ma widoczne wartości w nazwie dostępnej", () => {
    render(<WeatherDetails currentTemp={1.3} dailyMin={-4} dailyMax={-1.5} weatherCode={3} airQuality={null} />);
    const button = screen.getByRole("button");
    const name = button.textContent ?? "";
    expect(name).toContain("1.3°");
    expect(name).toContain("-4° / -1.5°");
    expect(name).toContain("Otwórz pełną prognozę");
    expect(button.getAttribute("aria-label")).toBeNull();
  });
});
