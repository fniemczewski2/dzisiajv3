// __tests__/pages/recurringTasks.test.tsx

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const h = vi.hoisted(() => ({
  tasks: [] as { id: string; title: string; description: string; is_recurring: boolean }[],
  deleteTask: vi.fn(async () => undefined),
}));

vi.mock("next/router", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/ui/SEO", () => ({ default: () => null }));
vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u1" }, supabase: {} }) }));
vi.mock("@/hooks/db/useSettings", () => ({ useSettings: () => ({ settings: { users: [] } }) }));
vi.mock("@/hooks/db/useTasks", () => ({
  useTasks: () => ({
    acceptTask: vi.fn(),
    editTask: vi.fn(),
    deleteTask: h.deleteTask,
    setDoneTask: vi.fn(),
    loading: false,
  }),
}));
vi.mock("@/hooks/db/useRecurringTasks", () => ({
  RECURRING_TASKS_KEY: "recurring-tasks",
  useRecurringTasks: () => ({ data: h.tasks, isLoading: false }),
}));
vi.mock("@/components/tasks/TaskItem", () => ({
  default: ({ task, deleteTask }: { task: { id: string; title: string }; deleteTask: (id: string) => void }) => (
    <div>
      <span>{task.title}</span>
      <button type="button" onClick={() => deleteTask(task.id)}>
        Usuń {task.title}
      </button>
    </div>
  ),
}));

import RecurringTasksPage from "@/pages/tasks/recurring";

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <RecurringTasksPage />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  h.deleteTask.mockClear();
  h.tasks = [
    { id: "t1", title: "Raport miesięczny", description: "", is_recurring: true },
    { id: "t2", title: "Podlewanie kwiatów", description: "balkon", is_recurring: true },
  ];
});

describe("widok zadań cyklicznych", () => {
  it("pokazuje nagłówek i wszystkie reguły", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Zadania cykliczne" })).toBeInTheDocument();
    expect(screen.getByText("Raport miesięczny")).toBeInTheDocument();
    expect(screen.getByText("Podlewanie kwiatów")).toBeInTheDocument();
  });

  it("wyszukiwanie filtruje po tytule i opisie", () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText("Szukaj zadań cyklicznych…"), { target: { value: "balkon" } });
    expect(screen.queryByText("Raport miesięczny")).toBeNull();
    expect(screen.getByText("Podlewanie kwiatów")).toBeInTheDocument();
  });

  it("usunięcie wywołuje deleteTask z identyfikatorem reguły", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Usuń Raport miesięczny" }));
    await waitFor(() => expect(h.deleteTask).toHaveBeenCalledWith("t1"));
  });

  it("brak reguł: komunikat z instrukcją", () => {
    h.tasks = [];
    renderPage();
    expect(screen.getByText("Dodaj zadanie i ustaw w formularzu powtarzanie.")).toBeInTheDocument();
  });
});
