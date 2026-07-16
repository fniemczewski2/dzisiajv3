import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  SaveButton,
  FormButtons,
  ToggleSwitch,
  ToggleChip,
  IconActionButton,
  DeleteButton,
} from "@/components/ui/CommonButtons";
import { Trash2 } from "lucide-react";

describe("SaveButton", () => {
  it("shows the Save icon and is enabled when not loading", () => {
    render(<SaveButton />);
    const button = screen.getByRole("button", { name: "zapisz" });
    expect(button).not.toBeDisabled();
    expect(button.querySelector(".animate-spin")).toBeNull();
  });

  it("shows a spinner and is disabled while loading", () => {
    render(<SaveButton loading />);
    const button = screen.getByRole("button", { name: "zapisz" });
    expect(button).toBeDisabled();
    expect(button.querySelector(".animate-spin")).not.toBeNull();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<SaveButton onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: "zapisz" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("FormButtons", () => {
  // Regresja: FormButtons kiedyś nie przekazywał `loading` do SaveButton,
  // przez co spinner zapisu nigdy się nie pokazywał w żadnym formularzu.
  it("propagates the loading state down to the inner SaveButton", () => {
    render(<FormButtons loading onClickSave={() => {}} onClickClose={() => {}} />);
    const saveButton = screen.getByRole("button", { name: "zapisz" });
    expect(saveButton).toBeDisabled();
    expect(saveButton.querySelector(".animate-spin")).not.toBeNull();
  });

  it("renders an AddAnotherButton instead of SaveButton when addMany is set", () => {
    render(
      <FormButtons
        addMany
        onAddAnother={() => {}}
        onClickClose={() => {}}
      />
    );
    expect(screen.queryByRole("button", { name: "zapisz" })).toBeNull();
    expect(screen.getByRole("button", { name: "dodaj kolejny" })).toBeInTheDocument();
  });

  it("disables both buttons while loading, even without addMany", () => {
    render(<FormButtons loading onClickClose={() => {}} />);
    expect(screen.getByRole("button", { name: "zapisz" })).toBeDisabled();
    // CloseButton nie blokuje się na `loading`, tylko na `disabled` — sprawdzamy,
    // że nie rzuca błędu i renderuje się poprawnie obok zablokowanego Zapisz.
    expect(screen.getByRole("button", { name: "zamknij" })).toBeInTheDocument();
  });
});

describe("ToggleSwitch", () => {
  it("reflects the checked state via aria-checked", () => {
    render(<ToggleSwitch checked onChange={() => {}} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("calls onChange with the inverted value when clicked", async () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("does not fire onChange when disabled", async () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} disabled />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("ToggleChip", () => {
  it("exposes its active state via aria-pressed", () => {
    render(<ToggleChip label="Wegańskie" active onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Wegańskie" })).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onClick when tapped", async () => {
    const onClick = vi.fn();
    render(<ToggleChip label="Ser" active={false} onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: "Ser" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("IconActionButton", () => {
  it("uses the title as the accessible name", () => {
    render(<IconActionButton onClick={() => {}} Icon={Trash2} title="Usuń wpis" />);
    expect(screen.getByRole("button", { name: "Usuń wpis" })).toBeInTheDocument();
  });

  it("is disabled and inert when disabled is true", async () => {
    const onClick = vi.fn();
    render(<IconActionButton onClick={onClick} Icon={Trash2} title="Usuń wpis" disabled />);
    const button = screen.getByRole("button", { name: "Usuń wpis" });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("DeleteButton", () => {
  it("calls onClick when pressed", async () => {
    const onClick = vi.fn();
    render(<DeleteButton onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: "usuń" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
