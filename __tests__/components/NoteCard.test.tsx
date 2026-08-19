// __tests__/components/NoteCard.test.tsx

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NoteCard from "@/components/notes/NoteCard";
import type { Note } from "@/types/notes";

const colorMap = { "zinc-50": "bg-zinc-50" };

function makeNote(items: string[]): Note {
  return {
    id: "note-1",
    title: "Test",
    items,
    bg_color: "zinc-50",
    user_id: "user-1",
  };
}

const noop = vi.fn();

describe("NoteCard formatting", () => {
  it("renders a bullet block as a <ul>", () => {
    render(
      <NoteCard
        note={makeNote(["- milk", "- bread"])}
        onEdit={noop}
        onDelete={noop}
        onTogglePin={noop}
        onToggleArchive={noop}
        colorMap={colorMap}
      />
    );
    expect(document.querySelector("ul")).not.toBeNull();
    expect(screen.getByText("milk")).toBeInTheDocument();
    expect(screen.getByText("bread")).toBeInTheDocument();
  });

  it("renders a numbered block as an <ol>", () => {
    render(
      <NoteCard
        note={makeNote(["1. first", "2. second"])}
        onEdit={noop}
        onDelete={noop}
        onTogglePin={noop}
        onToggleArchive={noop}
        colorMap={colorMap}
      />
    );
    expect(document.querySelector("ol")).not.toBeNull();
  });

  it("renders **bold** markers as <strong>", () => {
    render(
      <NoteCard
        note={makeNote(["hello **world**"])}
        onEdit={noop}
        onDelete={noop}
        onTogglePin={noop}
        onToggleArchive={noop}
        colorMap={colorMap}
      />
    );
    const strong = document.querySelector("strong");
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe("world");
  });

  it("auto-links a bare domain mentioned mid-sentence", () => {
    render(
      <NoteCard
        note={makeNote(["zobacz na google.pl jutro"])}
        onEdit={noop}
        onDelete={noop}
        onTogglePin={noop}
        onToggleArchive={noop}
        colorMap={colorMap}
      />
    );
    const link = screen.getByRole("link", { name: "google.pl" });
    expect(link).toHaveAttribute("href", "https://google.pl/");
  });

  it("does not render archived note content", () => {
    const note = makeNote(["- milk"]);
    note.archived = true;
    render(
      <NoteCard
        note={note}
        onEdit={noop}
        onDelete={noop}
        onTogglePin={noop}
        onToggleArchive={noop}
        colorMap={colorMap}
      />
    );
    expect(document.querySelector("ul")).toBeNull();
  });
});
