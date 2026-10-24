// __tests__/components/DemoTour.test.tsx

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Calendar, ListTodo, Timer } from "lucide-react";
import DemoTour from "@/components/demo/DemoTour";
import type { DemoStep } from "@/lib/demoTour";

const steps: DemoStep[] = [
  { id: "a", category: "Zadania", title: "Zadania", description: "Opis zadań", icon: ListTodo, path: "/tasks" },
  {
    id: "b",
    category: "Spotkania",
    title: "Kalendarz",
    description: "Opis kalendarza",
    icon: Calendar,
    path: "/calendar",
  },
  { id: "c", category: "Zadania", title: "Pomodoro", description: "Opis timera", icon: Timer },
];

describe("DemoTour", () => {
  it("startuje od pierwszego kroku i pokazuje numer kroku", () => {
    render(<DemoTour steps={steps} />);
    expect(screen.getByRole("heading", { name: "Zadania" })).toBeInTheDocument();
    expect(screen.getByText("Krok 1 z 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Wstecz/ })).toBeDisabled();
  });

  it("„Dalej” i „Wstecz” przechodzą między krokami", () => {
    render(<DemoTour steps={steps} />);
    fireEvent.click(screen.getByRole("button", { name: /Dalej/ }));
    expect(screen.getByRole("heading", { name: "Kalendarz" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Wstecz/ }));
    expect(screen.getByRole("heading", { name: "Zadania" })).toBeInTheDocument();
  });

  it("na ostatnim kroku „Dalej” jest wyłączone i nie wychodzi poza listę", () => {
    render(<DemoTour steps={steps} />);
    const next = screen.getByRole("button", { name: /Dalej/ });
    fireEvent.click(next);
    fireEvent.click(next);
    expect(screen.getByRole("heading", { name: "Pomodoro" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dalej/ })).toBeDisabled();
  });

  it("nawigacja to natywne przyciski, więc działa z klawiatury bez dodatkowej obsługi", () => {
    render(<DemoTour steps={steps} />);
    const next = screen.getByRole("button", { name: /Dalej/ });
    expect(next.tagName).toBe("BUTTON");
    expect(next).not.toHaveAttribute("tabindex", "-1");
    next.focus();
    expect(next).toHaveFocus();
    fireEvent.click(next);
    expect(screen.getByText("Krok 2 z 3")).toBeInTheDocument();
  });

  it("„Wypróbuj” prowadzi przez logowanie do strony funkcji, a krok bez ścieżki go nie ma", () => {
    render(<DemoTour steps={steps} />);
    expect(screen.getByRole("link", { name: "Wypróbuj: Zadania" })).toHaveAttribute("href", "/start?next=%2Ftasks");
    fireEvent.click(screen.getByRole("button", { name: /Dalej/ }));
    fireEvent.click(screen.getByRole("button", { name: /Dalej/ }));
    expect(screen.queryByRole("link", { name: /Wypróbuj/ })).toBeNull();
  });

  it("postęp ma poprawne wartości dla czytników ekranu", () => {
    render(<DemoTour steps={steps} />);
    fireEvent.click(screen.getByRole("button", { name: /Dalej/ }));
    const bar = screen.getByRole("progressbar", { name: "Postęp przewodnika" }) as HTMLProgressElement;
    expect(bar.value).toBe(2);
    expect(bar.max).toBe(3);
  });

  it("nie wywołuje niczego poza nawigacją (brak zapisu danych)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<DemoTour steps={steps} />);
    fireEvent.click(screen.getByRole("button", { name: /Dalej/ }));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
