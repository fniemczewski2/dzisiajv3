// __tests__/components/NoteFormatToolbar.test.tsx

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import NoteFormatToolbar from "@/components/notes/NoteFormatToolbar";

function setup(initialValue: string) {
  const ref = createRef<HTMLTextAreaElement>();
  render(
    <>
      <textarea ref={ref} defaultValue={initialValue} aria-label="note-body" />
      <NoteFormatToolbar textareaRef={ref} />
    </>
  );
  return ref;
}

describe("NoteFormatToolbar", () => {
  it("wraps the current selection in ** when Bold is clicked", async () => {
    const ref = setup("hello world");
    const textarea = screen.getByLabelText("note-body") as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 5);

    await userEvent.click(screen.getByRole("button", { name: "Pogrubienie" }));

    expect(ref.current?.value).toBe("**hello** world");
  });

  it("adds a bullet marker to the current line when List is clicked", async () => {
    const ref = setup("milk");
    const textarea = screen.getByLabelText("note-body") as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 0);

    await userEvent.click(screen.getByRole("button", { name: "Lista punktowana" }));

    expect(ref.current?.value).toBe("- milk");
  });

  it("adds a numbered marker to the current line when Ordered list is clicked", async () => {
    const ref = setup("milk");
    const textarea = screen.getByLabelText("note-body") as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 0);

    await userEvent.click(screen.getByRole("button", { name: "Lista numerowana" }));

    expect(ref.current?.value).toBe("1. milk");
  });
});
