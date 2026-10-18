// __tests__/components/RecurringPreviewList.test.tsx

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/useTaskCategories", () => ({ useCategoryColors: () => ({ dom: "#0F7B6C" }) }));

import RecurringPreviewList from "@/components/tasks/RecurringPreviewList";
import type { Task } from "@/types/tasks";

const t = {
  id: "t1",
  title: "Podlać kwiaty",
  description: "",
  category: "dom",
  priority: 3,
  due_date: "2026-10-12",
  status: "pending",
  user_id: "u",
  for_user_id: "u",
  is_recurring: true,
  recurrence: { freq: "weekly", interval: 1, byWeekday: [0, 3] },
} as unknown as Task;

describe("RecurringPreviewList", () => {
  it("nic nie renderuje bez podglądów", () => {
    const { container } = render(<RecurringPreviewList previews={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("pokazuje podgląd z opisem reguły i informacją o bieżącym terminie", () => {
    render(<RecurringPreviewList previews={[{ key: "a", date: "2026-10-15", task: t }]} />);
    expect(screen.getByRole("heading", { name: /Powtórzenia \(podgląd\)/ })).toBeTruthy();
    expect(screen.getByText(/Podgląd powtórzenia/)).toBeTruthy();
    expect(screen.getByText(/Co tydzień: pn, cz/)).toBeTruthy();
    expect(screen.getByText(/termin 12\.10/)).toBeTruthy();
  });

  it("grupuje po dniach z nagłówkiem dnia", () => {
    render(
      <RecurringPreviewList
        groupByDate
        previews={[
          { key: "a", date: "2026-10-15", task: t },
          { key: "b", date: "2026-10-19", task: t },
        ]}
      />
    );
    expect(screen.getByRole("heading", { name: /czwartek, 15 października/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /poniedziałek, 19 października/i })).toBeTruthy();
  });
});
