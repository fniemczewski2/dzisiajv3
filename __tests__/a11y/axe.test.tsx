// __tests__/a11y/axe.test.tsx
//
// Automatyczna kontrola dostępności (axe-core, reguły WCAG 2.x A/AA) dla
// komponentów o złożonej strukturze: formularzy, przycisków akcji, siatek.
// Kontrast kolorów sprawdza osobny test tokenów (jsdom nie liczy stylów CSS).

import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import axe from "axe-core";

vi.mock("next/router", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), pathname: "/" }) }));

async function violations(container: HTMLElement) {
  const result = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    rules: { "color-contrast": { enabled: false } },
  });
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

describe("dostępność (axe-core)", () => {
  it("przyciski akcji mają dostępne nazwy", async () => {
    const { DeleteButton, UploadButton, FavButton, SaveButton, ToggleSwitch } =
      await import("@/components/ui/CommonButtons");
    const { container } = render(
      <div>
        <DeleteButton onClick={() => undefined} ariaLabel="Usuń wpis" small />
        <UploadButton onClick={() => undefined} fileFormat=".csv" small />
        <FavButton onClick={() => undefined} small />
        <SaveButton onClick={() => undefined} small />
        <ToggleSwitch label="Powiadomienia" checked onChange={() => undefined} />
      </div>
    );
    expect(await violations(container)).toEqual([]);
  });

  it("wybór koloru notatki to poprawna grupa przycisków radiowych", async () => {
    const { default: NoteColorPicker } = await import("@/components/notes/NoteColorPicker");
    const { container } = render(<NoteColorPicker value="zinc-50" onChange={() => undefined} />);
    expect(await violations(container)).toEqual([]);
  });

  it("pola finansowe mają etykiety", async () => {
    const { AmountField, CategorySelect, ProfileSelect } = await import("@/components/finance/FinanceFields");
    const { container } = render(
      <form aria-label="Transakcja">
        <AmountField id="t" value="" onChange={() => undefined} />
        <CategorySelect id="t" value="" onChange={() => undefined} categories={[]} />
        <ProfileSelect id="t" value="" onChange={() => undefined} profiles={[{ id: "p", name: "Firma" } as never]} />
      </form>
    );
    expect(await violations(container)).toEqual([]);
  });

  it("lista telefonów w edytorze wizytówki ma etykiety pól i przycisków", async () => {
    const { default: TypedValueList } = await import("@/components/profiles/TypedValueList");
    const { container, getByRole } = render(
      <TypedValueList
        title="Numery telefonu"
        itemLabel="numer telefonu"
        items={[{ _id: "a", type: "Komórka", number: "600100200" }]}
        valueField="number"
        valuePlaceholder="Numer telefonu"
        inputType="tel"
        onAdd={() => undefined}
        onChange={() => undefined}
        onRemove={() => undefined}
      />
    );
    expect(await violations(container)).toEqual([]);
    expect(getByRole("button", { name: "Usuń numer telefonu: 600100200" })).toBeInTheDocument();
  });
});
