// __tests__/components/TaskItemUndo.test.tsx

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ user: { id: "me" }, supabase: {} }) }));
vi.mock("@/hooks/useTaskCategories", () => ({ useTaskCategories: () => ["praca", "inne"] }));

import TaskItem from "@/components/tasks/TaskItem";
import type { Task } from "@/types/tasks";

const base = {
  id: "t1", title: "Raport", description: "", category: "praca", priority: 3,
  due_date: "2030-05-15", user_id: "me", for_user_id: null,
} as unknown as Task;

function setup(status: string) {
  const setDoneTask = vi.fn(() => Promise.resolve());
  const onTasksChange = vi.fn();
  render(
    <TaskItem
      task={{ ...base, status } as Task}
      acceptTask={vi.fn()} setDoneTask={setDoneTask} editTask={vi.fn()} deleteTask={vi.fn()}
      onTasksChange={onTasksChange} userId="me" userOptions={[]} loading={false}
    />
  );
  return { setDoneTask, onTasksChange };
}

describe("TaskItem – cofnięcie wykonania", () => {
  it("wykonane zadanie ma przycisk „Przywróć”, który cofa wykonanie", async () => {
    const { setDoneTask, onTasksChange } = setup("done");
    fireEvent.click(screen.getByRole("button", { name: "Oznacz jako niewykonane" }));
    expect(setDoneTask).toHaveBeenCalledWith("t1", false);
    await waitFor(() => expect(onTasksChange).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Zrobione" })).toBeNull();
  });

  it("niewykonane zadanie ma „Zrobione”, a nie „Przywróć”", () => {
    const { setDoneTask } = setup("pending");
    expect(screen.queryByRole("button", { name: "Oznacz jako niewykonane" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Zrobione" }));
    expect(setDoneTask).toHaveBeenCalledWith("t1", true);
  });
});
