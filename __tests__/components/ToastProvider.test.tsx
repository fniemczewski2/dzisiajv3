// __tests__/components/ToastProvider.test.tsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "@/providers/ToastProvider";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  });
});

let api: ReturnType<typeof useToast>["toast"];
function Grab() {
  api = useToast().toast;
  return null;
}

describe("ToastProvider confirm", () => {
  it("renders the confirm dialog outside the bottom notification stack, centered", async () => {
    render(<ToastProvider><Grab /></ToastProvider>);
    act(() => { api.success("Zapisano"); });
    let promise!: Promise<boolean>;
    act(() => { promise = api.confirm("Czy chcesz usunąć przepis?"); });

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("open");
    // wyśrodkowanie mimo preflightu Tailwinda
    expect(dialog.className).toMatch(/\bm-auto\b/);
    expect(dialog.className).toMatch(/\binset-0\b/);
    // nie siedzi w kontenerze powiadomień przyklejonym do dołu ekranu
    expect(dialog.closest(".bottom-32")).toBeNull();
    expect(screen.getByText("Zapisano").closest(".bottom-32")).not.toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Usuń" }));
    await expect(promise).resolves.toBe(true);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("resolves false on cancel", async () => {
    render(<ToastProvider><Grab /></ToastProvider>);
    let promise!: Promise<boolean>;
    act(() => { promise = api.confirm("Usunąć?"); });
    await userEvent.click(await screen.findByRole("button", { name: "Anuluj" }));
    await expect(promise).resolves.toBe(false);
  });

  it("uses a correctly encoded default loading message", () => {
    render(<ToastProvider><Grab /></ToastProvider>);
    act(() => { api.loading(); });
    expect(screen.getByText("Ładowanie...")).toBeInTheDocument();
  });
});
