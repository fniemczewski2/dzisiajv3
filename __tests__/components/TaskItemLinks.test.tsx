// Linki w opisie zadania są klikalne tak jak w notatkach.

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ user: { id: "me" }, supabase: {} }) }));
vi.mock("@/hooks/useTaskCategories", () => ({
  useTaskCategories: () => ["praca", "inne"],
  useCategoryColors: () => ({}),
}));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }) }));

import TaskItem from "@/components/tasks/TaskItem";
import type { Task } from "@/types/tasks";

const base = {
  id: "t1",
  title: "Raport",
  description: "",
  category: "praca",
  priority: 3,
  due_date: "2030-05-15",
  status: "pending",
  user_id: "me",
  for_user_id: null,
} as unknown as Task;

const renderTask = (description: string) =>
  render(
    <TaskItem
      task={{ ...base, description }}
      acceptTask={vi.fn()}
      setDoneTask={vi.fn()}
      editTask={vi.fn()}
      deleteTask={vi.fn()}
      onTasksChange={vi.fn()}
      userId="me"
      userOptions={[]}
      loading={false}
    />
  );

describe("TaskItem – linki w opisie", () => {
  it("adres w opisie jest klikalnym linkiem otwieranym w nowej karcie", () => {
    renderTask("Dokumentacja:\nhttps://docs.example.com/spec, termin w piątek");
    const link = screen.getByRole("link", { name: "docs.example.com/spec" });
    expect(link).toHaveAttribute("href", "https://docs.example.com/spec");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("link nie jest zagnieżdżony w przycisku (kliknięcie nie uruchamia timera)", () => {
    renderTask("Zobacz www.example.com");
    expect(screen.getByRole("link", { name: "example.com" }).closest("button")).toBeNull();
  });

  it("opis bez adresu i niebezpieczny schemat nie tworzą linków", () => {
    renderTask("Zadzwonić do klienta javascript:alert(1)");
    expect(screen.queryByRole("link")).toBeNull();
  });
});
