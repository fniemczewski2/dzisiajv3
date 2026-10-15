// __tests__/components/ReportForm.test.tsx

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReportForm from "@/components/reports/ReportForm";
import type { Report } from "@/types/reports";

const report = {
  id: "r1", user_id: "u", topic: "Zarząd", date: "2026-10-15",
  agenda: ["Budżet"], participants: ["Anna", "Jan"],
  tasks: [{ zadanie: "Sprawozdanie", data: "2026-10-31", osoba: "Anna" }],
  notes: "OK", template_id: "a", inserted_at: "", updated_at: "",
} as Report;
const templates = [{ id: "a", name: "Fundacja A" }, { id: "b", name: "Fundacja B" }];

describe("ReportForm", () => {
  it("edycja: pola wypełnione, pisanie nie gubi wiersza, zapis z wybranym szablonem", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ReportForm initial={report} templates={templates} defaultTemplateId="b" loading={false} onSubmit={onSubmit} onCancel={vi.fn()} />);

    const agenda = screen.getByLabelText("Agenda 1") as HTMLInputElement;
    expect(agenda.value).toBe("Budżet");
    fireEvent.change(agenda, { target: { value: "Budżet 2027" } });
    expect(screen.getByLabelText("Agenda 1")).toBe(agenda); // ten sam element – bez utraty fokusu

    expect((screen.getByLabelText("Osoby na spotkaniu 1") as HTMLInputElement).value).toBe("Anna");
    fireEvent.change(screen.getByLabelText("Szablon PDF:"), { target: { value: "b" } });
    fireEvent.submit(agenda.closest("form")!);

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ topic: "Zarząd", agenda: ["Budżet 2027"], template_id: "b" });
  });

  it("powrót do szablonu domyślnego zapisuje template_id = null", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ReportForm initial={report} templates={templates} defaultTemplateId="b" loading={false} onSubmit={onSubmit} onCancel={vi.fn()} />);
    expect(screen.getByRole("option", { name: "Domyślny (Fundacja B)" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Szablon PDF:"), { target: { value: "" } });
    fireEvent.submit(screen.getByLabelText("Agenda 1").closest("form")!);
    await waitFor(() => expect(onSubmit.mock.calls[0][0].template_id).toBeNull());
  });
});
