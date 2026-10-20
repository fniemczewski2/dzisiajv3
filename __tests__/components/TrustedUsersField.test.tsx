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
    fireEvent.click(screen.getByRole("button", { name: /Dodaj osobę/ }));
    expect(onChange).toHaveBeenLastCalledWith(["z@x.pl", ""]);
  });
});
