// __tests__/components/ReportTasksToApp.test.tsx

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const inserted: unknown[] = [];
const supabase = {
  from: () => ({
    insert: (row: unknown) => {
      inserted.push(row);
      return { select: () => ({ single: async () => ({ data: { id: 99 + inserted.length }, error: null }) }) };
    },
  }),
};
vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u1" }, supabase }) }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }) }));
vi.mock("@/hooks/useTaskCategories", () => ({ useTaskCategories: () => ["praca", "inne"] }));

import ReportTasksToApp from "@/components/reports/ReportTasksToApp";
import { toAppTask, reportTaskChoices } from "@/lib/reportToTasks";
import type { Report } from "@/types/reports";

const report = {
  id: "r1", user_id: "u1", topic: "Zarząd", date: "2026-10-15", agenda: [], participants: [], notes: "",
  tasks: [
    { zadanie: "Sprawozdanie dla NIW", data: "2026-10-31", osoba: "Anna" },
    { zadanie: "Polityka RODO", data: "", osoba: "" },
    { zadanie: "Już dodane", data: "", osoba: "", app_task_id: "55" },
    { zadanie: "  ", data: "", osoba: "" },
  ],
  inserted_at: "", updated_at: "",
} as Report;

describe("zadania z protokołu", () => {
  it("lista: pomija puste, oznacza dodane", () => {
    expect(reportTaskChoices(report).map((c) => [c.index, c.added])).toEqual([[0, false], [1, false], [2, true]]);
  });

  it("zadanie: termin z protokołu albo zastępczy, opis ze źródłem i osobą", () => {
    const t = toAppTask(report, report.tasks[0], { userId: "u1", category: "praca", fallbackDue: "2026-10-20" });
    expect(t).toMatchObject({ title: "Sprawozdanie dla NIW", due_date: "2026-10-31", category: "praca", for_user_id: "u1" });
    expect(t.description).toBe("Z protokołu „Zarząd” z 15.10.2026. Odpowiada: Anna.");
    expect(toAppTask(report, report.tasks[1], { userId: "u1", category: "inne", fallbackDue: "2026-10-20" }).due_date).toBe("2026-10-20");
  });

  it("każde zadanie dodaje się osobno i zapisuje swoje id w protokole", async () => {
    const onTasksLinked = vi.fn().mockResolvedValue(undefined);
    render(<ReportTasksToApp report={report} onTasksLinked={onTasksLinked} onClose={vi.fn()} />);

    expect(screen.getByText("W Zadaniach")).toBeTruthy(); // trzecie było już dodane
    expect(screen.queryByRole("button", { name: /Dodaj do Zadań: Już dodane/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /zaznaczone/ })).toBeNull(); // brak dodawania hurtem

    // zadanie bez terminu: własny termin w wierszu
    fireEvent.change(screen.getByLabelText(/Termin zadania „Polityka RODO”/), { target: { value: "2026-11-02" } });
    fireEvent.click(screen.getByRole("button", { name: "Dodaj do Zadań: Polityka RODO" }));

    await waitFor(() => expect(onTasksLinked).toHaveBeenCalledTimes(1));
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ title: "Polityka RODO", due_date: "2026-11-02" });
    const linked = onTasksLinked.mock.calls[0][0];
    expect(linked[0].app_task_id).toBeUndefined(); // pierwsze nie zostało dodane
    expect(linked[1].app_task_id).toBe("100");
    expect(linked[2].app_task_id).toBe("55");
  });
});
