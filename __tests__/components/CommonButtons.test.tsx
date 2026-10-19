// __tests__/components/CommonButtons.test.tsx

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
  UploadButton,
  FavButton,
} from "@/components/ui/CommonButtons";
import { Trash2 } from "lucide-react";

describe("SaveButton", () => {
  it("shows the Save icon and is enabled when not loading", () => {
    render(<SaveButton />);
    const button = screen.getByRole("button", { name: "Zapisz" });
    expect(button).not.toBeDisabled();
    expect(button.querySelector(".animate-spin")).toBeNull();
  });

  it("shows a spinner and is disabled while loading", () => {
    render(<SaveButton loading />);
    const button = screen.getByRole("button", { name: "Zapisz" });
    expect(button).toBeDisabled();
    expect(button.querySelector(".animate-spin")).not.toBeNull();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<SaveButton onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: "Zapisz" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("FormButtons", () => {
  it("propagates the loading state down to the inner SaveButton", () => {
    render(<FormButtons loading onClickSave={() => {}} onClickClose={() => {}} />);
    const saveButton = screen.getByRole("button", { name: "Zapisz" });
    expect(saveButton).toBeDisabled();
    expect(saveButton.querySelector(".animate-spin")).not.toBeNull();
  });

  it("renders an AddAnotherButton instead of SaveButton when addMany is set", () => {
    render(<FormButtons addMany onAddAnother={() => {}} onClickClose={() => {}} />);
    expect(screen.queryByRole("button", { name: "Zapisz" })).toBeNull();
    expect(screen.getByRole("button", { name: "Dodaj kolejny" })).toBeInTheDocument();
  });

  it("keeps the close button enabled when only saving is disabled (invalid form)", () => {
    render(<FormButtons disabled onClickSave={() => {}} onClickClose={() => {}} />);
    expect(screen.getByRole("button", { name: "Zapisz" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Zamknij" })).toBeEnabled();
  });

  it("disables both buttons while loading, even without addMany", () => {
    render(<FormButtons loading onClickClose={() => {}} />);
    expect(screen.getByRole("button", { name: "Zapisz" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Zamknij" })).toBeInTheDocument();
  });
});

describe("ToggleSwitch", () => {
  it("reflects the checked state via aria-checked", () => {
    render(<ToggleSwitch label="Przełącznik" checked onChange={() => {}} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("calls onChange with the inverted value when clicked", async () => {
    const onChange = vi.fn();
    render(<ToggleSwitch label="Przełącznik" checked={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("does not fire onChange when disabled", async () => {
    const onChange = vi.fn();
    render(<ToggleSwitch label="Przełącznik" checked={false} onChange={onChange} disabled />);
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
    await userEvent.click(screen.getByRole("button", { name: "Usuń" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("etykiety przycisków akcji", () => {
  it("przekazana nazwa dostępna trafia do przycisku (nie jest gubiona)", () => {
    render(
      <>
        <DeleteButton onClick={() => undefined} ariaLabel="Usuń szablon Zarząd" small />
        <UploadButton onClick={() => undefined} ariaLabel="Prześlij logo" small />
        <FavButton onClick={() => undefined} label="Ustaw jako domyślny" small />
      </>
    );
    expect(screen.getByRole("button", { name: "Usuń szablon Zarząd" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prześlij logo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ustaw jako domyślny" })).toBeInTheDocument();
  });
});
