// __tests__/components/SettingsSection.test.tsx

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsSection from "@/components/settings/SettingsSection";
import type { Settings } from "@/types/settings";

const base = { sort_order: "priority", sort_notes: "updated_desc", show_completed: true } as unknown as Settings;
const defaults = { ...base, sort_order: "priority", sort_notes: "updated_desc" } as Settings;

function Section({
  settings,
  onSave,
}: Readonly<{ settings: Settings; onSave: (p: Partial<Settings>) => Promise<boolean> }>) {
  return (
    <SettingsSection
      id="s"
      title="Sortowanie"
      keys={["sort_order", "sort_notes"] as const}
      settings={settings}
      defaults={defaults}
      onSave={onSave}
    >
      {(d, set) => (
        <>
          <label htmlFor="o">Zadania</label>
          <select id="o" value={d.sort_order} onChange={(e) => set("sort_order", e.target.value)}>
            <option value="priority">Priorytet</option>
            <option value="alphabetical">Alfabetycznie</option>
          </select>
        </>
      )}
    </SettingsSection>
  );
}

describe("SettingsSection", () => {
  it("zapisuje tylko pola sekcji i tylko gdy coś się zmieniło", async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<Section settings={base} onSave={onSave} />);
    const save = screen.getByRole("button", { name: "Zapisz" });
    expect((save as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Zadania"), { target: { value: "alphabetical" } });
    expect(screen.getByText("Niezapisane zmiany")).toBeTruthy();
    fireEvent.click(save);
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({ sort_order: "alphabetical", sort_notes: "updated_desc" })
    );
    expect(Object.keys(onSave.mock.calls[0][0])).not.toContain("show_completed");
  });

  it("zmiana innego pola w bazie nie kasuje niezapisanej zmiany w sekcji", () => {
    const { rerender } = render(<Section settings={base} onSave={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Zadania"), { target: { value: "alphabetical" } });
    rerender(<Section settings={{ ...base, show_completed: false } as Settings} onSave={vi.fn()} />);
    expect((screen.getByLabelText("Zadania") as HTMLSelectElement).value).toBe("alphabetical");
  });

  it("„Domyślne w tej sekcji” przywraca domyślne do kopii roboczej", () => {
    render(<Section settings={{ ...base, sort_order: "alphabetical" } as Settings} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Domyślne w tej sekcji/ }));
    expect((screen.getByLabelText("Zadania") as HTMLSelectElement).value).toBe("priority");
    expect(screen.getByText("Niezapisane zmiany")).toBeTruthy();
  });
});
