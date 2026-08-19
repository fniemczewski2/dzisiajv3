// __tests__/components/Modal.test.tsx

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "@/components/ui/Modal";

// jsdom (the test environment) doesn't implement HTMLDialogElement's
// showModal/close/open — polyfill just enough of the real behavior so the
// component's actual open/close logic gets exercised for real, instead of
// being a no-op behind the `typeof dialog.showModal !== "function"` guard.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Modal", () => {
  it("calls showModal when open becomes true", () => {
    const { rerender } = render(
      <Modal open={false} onClose={() => {}} label="Test">
        <p>content</p>
      </Modal>
    );
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();

    rerender(
      <Modal open onClose={() => {}} label="Test">
        <p>content</p>
      </Modal>
    );
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("calls close when open becomes false", () => {
    const { rerender } = render(
      <Modal open onClose={() => {}} label="Test">
        <p>content</p>
      </Modal>
    );
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);

    rerender(
      <Modal open={false} onClose={() => {}} label="Test">
        <p>content</p>
      </Modal>
    );
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the dialog fires a native close event (Escape)", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} label="Test">
        <p>content</p>
      </Modal>
    );
    const dialog = document.querySelector("dialog")!;
    dialog.dispatchEvent(new Event("close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when clicking the backdrop (the dialog element itself)", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} label="Test">
        <p>content</p>
      </Modal>
    );
    const dialog = document.querySelector("dialog")!;
    await userEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when clicking inside the modal content", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} label="Test">
        <button type="button">inside</button>
      </Modal>
    );
    await userEvent.click(screen.getByRole("button", { name: "inside" }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders no children while closed", () => {
    render(
      <Modal open={false} onClose={() => {}} label="Test">
        <p>hidden content</p>
      </Modal>
    );
    expect(screen.queryByText("hidden content")).not.toBeInTheDocument();
  });
});
