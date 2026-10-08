// __tests__/components/TaskCategoriesEditor.test.tsx

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TaskCategoriesEditor from "@/components/settings/TaskCategoriesEditor";

function setup(value: string[] | null = ["praca", "dom"]) {
  const onChange = vi.fn();
  const onRenamesChange = vi.fn();
  render(<TaskCategoriesEditor value={value} onChange={onChange} onRenamesChange={onRenamesChange} />);
  return { onChange, onRenamesChange };
}

describe("TaskCategoriesEditor", () => {
  it("dodaje kategorię (także Enterem, bez wysyłania formularza)", () => {
    const { onChange } = setup();
    const input = screen.getByLabelText("Nowa kategoria");
    fireEvent.change(input, { target: { value: "  Ogród " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith(["praca", "dom", "Ogród"]);
  });

  it("odrzuca duplikat i nazwę systemową z komunikatem", () => {
    const { onChange } = setup();
    const input = screen.getByLabelText("Nowa kategoria");
    fireEvent.change(input, { target: { value: "PRACA" } });
    fireEvent.click(screen.getByRole("button", { name: /Dodaj/ }));
    expect(screen.getByText("Kategoria „PRACA” już istnieje.")).toBeTruthy();
    fireEvent.change(input, { target: { value: "slack" } });
    fireEvent.click(screen.getByRole("button", { name: /Dodaj/ }));
    expect(screen.getByText(/kategoria systemowa/)).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("zmiana nazwy zgłasza przeniesienie zadań", () => {
    const { onChange, onRenamesChange } = setup();
    fireEvent.change(screen.getByLabelText("Nazwa kategorii 1"), { target: { value: "Praca zawodowa" } });
    expect(onChange).toHaveBeenLastCalledWith(["Praca zawodowa", "dom"]);
    expect(onRenamesChange).toHaveBeenLastCalledWith([["praca", "Praca zawodowa"]]);
  });

  it("błędna nazwa nie trafia do zapisu", () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText("Nazwa kategorii 2"), { target: { value: "praca" } });
    expect(screen.getByLabelText("Nazwa kategorii 2").getAttribute("aria-invalid")).toBe("true");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("usuwa kategorię, ale ostatniej nie da się usunąć", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Usuń kategorię dom" }));
    expect(onChange).toHaveBeenLastCalledWith(["praca"]);
    expect((screen.getByRole("button", { name: "Usuń kategorię praca" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("„Przywróć domyślne” zapisuje null", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: /Przywróć domyślne/ }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("pokazuje kategorie systemowe jako stałe", () => {
    setup();
    expect(screen.getByText("Kategorie systemowe – zawsze dostępne")).toBeTruthy();
    expect(screen.getByText("slack")).toBeTruthy();
  });
});
