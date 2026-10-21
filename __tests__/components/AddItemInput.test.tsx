import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddItemInput from "@/components/settings/AddItemInput";

const setup = (props: Partial<React.ComponentProps<typeof AddItemInput>> = {}) => {
  const onAdd = vi.fn();
  render(<AddItemInput count={0} max={3} onAdd={onAdd} label="Nowy nawyk" addLabel="Dodaj nawyk" {...props} />);
  return { onAdd, input: screen.getByLabelText("Nowy nawyk") };
};

describe("AddItemInput", () => {
  it("dodaje oczyszczony tekst przyciskiem i czyści pole", async () => {
    const user = userEvent.setup();
    const { onAdd, input } = setup({ maxLength: 20 });
    await user.type(input, "  Spacer   po  lesie ");
    await user.click(screen.getByRole("button", { name: "Dodaj nawyk" }));
    expect(onAdd).toHaveBeenCalledWith("Spacer po lesie");
    expect(input).toHaveValue("");
  });

  it("Enter dodaje pozycję i nie wysyła formularza", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const onAdd = vi.fn();
    render(
      <form onSubmit={onSubmit}>
        <AddItemInput count={0} max={3} onAdd={onAdd} label="Nowy nawyk" />
      </form>
    );
    await user.type(screen.getByLabelText("Nowy nawyk"), "Joga{Enter}");
    expect(onAdd).toHaveBeenCalledWith("Joga");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("przycisk jest wyłączony przy pustym polu", () => {
    setup();
    expect(screen.getByRole("button", { name: "Dodaj nawyk" })).toBeDisabled();
  });

  it("ukrywa się po osiągnięciu limitu", () => {
    const { container } = render(<AddItemInput count={3} max={3} onAdd={vi.fn()} label="Nowy nawyk" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("po osiągnięciu limitu pokazuje komunikat, jeśli podano limitMessage", () => {
    render(<AddItemInput count={3} max={3} onAdd={vi.fn()} label="Nowy nawyk" limitMessage="Limit 3 nawyków" />);
    expect(screen.getByRole("status")).toHaveTextContent("Limit 3 nawyków");
    expect(screen.queryByLabelText("Nowy nawyk")).not.toBeInTheDocument();
  });

  it("pokazuje błąd walidacji i nie wywołuje onAdd", async () => {
    const user = userEvent.setup();
    const { onAdd, input } = setup({ validate: (v) => (v === "x" ? "Za krótka nazwa" : null) });
    await user.type(input, "x{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent("Za krótka nazwa");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("zachowuje tekst, gdy onAdd zwróci false", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(false);
    render(<AddItemInput count={0} max={3} onAdd={onAdd} label="Nowy nawyk" />);
    const input = screen.getByLabelText("Nowy nawyk");
    await user.type(input, "Joga{Enter}");
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue("Joga");
  });
});
