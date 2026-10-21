// __tests__/components/TrustedUsersField.test.tsx

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TrustedUsersField from "@/components/settings/TrustedUsersField";

describe("TrustedUsersField", () => {
  it("usunięcie środkowej osoby nie przenosi wpisów do sąsiednich pól", () => {
    const onChange = vi.fn();
    render(<TrustedUsersField users={["a@x.pl", "b@x.pl", "c@x.pl"]} onChange={onChange} />);
    const thirdInput = screen.getByLabelText("Adres e-mail zaufanej osoby 3");
    fireEvent.click(screen.getByRole("button", { name: "Usuń b@x.pl" }));
    expect(onChange).toHaveBeenLastCalledWith(["a@x.pl", "c@x.pl"]);
    // Ten sam element DOM (stały klucz), teraz jako druga osoba.
    expect(screen.getByLabelText("Adres e-mail zaufanej osoby 2")).toBe(thirdInput);
  });

  it("edycja i dodawanie przekazują pełną listę", () => {
    const onChange = vi.fn();
    render(<TrustedUsersField users={["a@x.pl"]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Adres e-mail zaufanej osoby 1"), { target: { value: "z@x.pl" } });
    expect(onChange).toHaveBeenLastCalledWith(["z@x.pl"]);
    fireEvent.change(screen.getByLabelText("Adres e-mail nowej zaufanej osoby"), { target: { value: " N@X.pl " } });
    fireEvent.click(screen.getByRole("button", { name: "Dodaj osobę" }));
    expect(onChange).toHaveBeenLastCalledWith(["z@x.pl", "n@x.pl"]);
  });

  it("odrzuca niepoprawny i zduplikowany adres", () => {
    const onChange = vi.fn();
    render(<TrustedUsersField users={["a@x.pl"]} onChange={onChange} />);
    const input = screen.getByLabelText("Adres e-mail nowej zaufanej osoby");
    fireEvent.change(input, { target: { value: "bez-malpy" } });
    fireEvent.click(screen.getByRole("button", { name: "Dodaj osobę" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Podaj poprawny adres e-mail.");
    fireEvent.change(input, { target: { value: "A@x.pl" } });
    fireEvent.click(screen.getByRole("button", { name: "Dodaj osobę" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Ta osoba jest już na liście.");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("ukrywa pole dodawania po osiągnięciu limitu", () => {
    const users = Array.from({ length: 10 }, (_, i) => `u${i}@x.pl`);
    render(<TrustedUsersField users={users} onChange={vi.fn()} />);
    expect(screen.queryByLabelText("Adres e-mail nowej zaufanej osoby")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Osiągnięto limit 10");
  });
});
