// __tests__/components/NoteFolders.test.tsx
//
// Foldery notatek (formularze, karta, filtr w liście) i pobieranie notatki jako Markdown.

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { Note } from "@/types/notes";

const h = vi.hoisted(() => ({
  notes: [] as unknown[],
  addNote: vi.fn(async (_note: unknown) => undefined),
  download: vi.fn(),
}));

vi.mock("@/hooks/db/useNotes", () => ({
  useNotes: () => ({
    notes: h.notes,
    addNote: h.addNote,
    deleteNote: vi.fn(),
    editNote: vi.fn(),
    togglePin: vi.fn(),
    toggleArchive: vi.fn(),
    loading: false,
  }),
}));
vi.mock("@/hooks/db/useSettings", () => ({ useSettings: () => ({ settings: { sort_notes: "alphabetical" } }) }));
vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/lib/notes/export", () => ({ downloadNoteMarkdown: (n: unknown) => h.download(n) }));

import NoteList from "@/components/notes/NoteList";
import NoteEditForm from "@/components/notes/NoteEditForm";
import NoteForm from "@/components/notes/NoteForm";
import NoteCard from "@/components/notes/NoteCard";

const note = (id: string, title: string, folder: string | null = null): Note => ({
  id,
  title,
  items: [`treść ${title}`],
  bg_color: "yellow",
  user_id: "u1",
  folder,
  updated_at: "2026-11-02T10:00:00Z",
});

const notes = [
  note("1", "Zebranie zarządu", "Fundacje/Zapłon"),
  note("2", "Plan FPMSK", "Fundacje/FPMSK"),
  note("3", "Przepis", "Dom"),
  note("4", "Luźna myśl"),
];

beforeEach(() => {
  h.notes = notes;
  h.addNote.mockClear();
  h.download.mockClear();
});

describe("NoteList – filtr folderów", () => {
  it("chipy z licznikami (folder nadrzędny obejmuje podfoldery) i „Bez folderu”", () => {
    render(<NoteList notes={notes} onNotesChange={vi.fn()} />);
    const group = screen.getByRole("group", { name: "Foldery notatek" });
    expect(within(group).getByRole("button", { name: "Wszystkie (4)" })).toHaveAttribute("aria-pressed", "true");
    expect(within(group).getByRole("button", { name: "Bez folderu (1)" })).toBeInTheDocument();
    expect(within(group).getByRole("button", { name: "Fundacje (2)" })).toBeInTheDocument();
    expect(within(group).getByRole("button", { name: "Fundacje/Zapłon (1)" })).toBeInTheDocument();
  });

  it("wybór folderu pokazuje tylko jego notatki; „Wszystkie” przywraca listę", () => {
    render(<NoteList notes={notes} onNotesChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Fundacje (2)" }));
    expect(screen.getByText("Zebranie zarządu")).toBeInTheDocument();
    expect(screen.getByText("Plan FPMSK")).toBeInTheDocument();
    expect(screen.queryByText("Przepis")).toBeNull();
    expect(screen.queryByText("Luźna myśl")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Bez folderu (1)" }));
    expect(screen.getByText("Luźna myśl")).toBeInTheDocument();
    expect(screen.queryByText("Plan FPMSK")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Wszystkie (4)" }));
    expect(screen.getByText("Przepis")).toBeInTheDocument();
  });

  it("bez żadnej notatki w folderze chipów nie ma", () => {
    render(<NoteList notes={[note("1", "A"), note("2", "B")]} onNotesChange={vi.fn()} />);
    expect(screen.queryByRole("group", { name: "Foldery notatek" })).toBeNull();
  });

  it("usunięcie ostatniej notatki z wybranego folderu wraca do widoku „Wszystkie”", () => {
    const { rerender } = render(<NoteList notes={notes} onNotesChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Dom (1)" }));
    expect(screen.queryByText("Zebranie zarządu")).toBeNull();
    rerender(<NoteList notes={notes.filter((n) => n.folder !== "Dom")} onNotesChange={vi.fn()} />);
    expect(screen.getByText("Zebranie zarządu")).toBeInTheDocument();
  });

  it("karta pokazuje folder i pozwala pobrać notatkę jako .md", () => {
    render(<NoteList notes={[notes[0]]} onNotesChange={vi.fn()} />);
    expect(screen.getAllByText("Fundacje/Zapłon").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Pobierz plik .md" }));
    expect(h.download).toHaveBeenCalledWith(notes[0]);
  });
});

describe("NoteCard", () => {
  const props = { onEdit: vi.fn(), onDelete: vi.fn(), onTogglePin: vi.fn(), onToggleArchive: vi.fn() };

  it("bez onDownload przycisku pobierania nie ma", () => {
    render(<NoteCard note={note("1", "A")} {...props} />);
    expect(screen.queryByRole("button", { name: "Pobierz plik .md" })).toBeNull();
  });
});

describe("NoteEditForm – folder", () => {
  it("zapis normalizuje folder (spacje, ukośniki); pusty folder to katalog główny", () => {
    const onSave = vi.fn();
    const { rerender } = render(
      <NoteEditForm
        note={note("1", "A", "x")}
        onSave={onSave}
        onCancel={vi.fn()}
        onChange={vi.fn()}
        loading={false}
        folders={["Dom"]}
      />
    );
    expect(screen.getByLabelText("Folder (opcjonalnie):")).toHaveValue("x");
    rerender(
      <NoteEditForm
        note={note("1", "A", " Dom / Kuchnia ")}
        onSave={onSave}
        onCancel={vi.fn()}
        onChange={vi.fn()}
        loading={false}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /zapisz/i }));
    expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ folder: "Dom/Kuchnia" }));
    rerender(
      <NoteEditForm note={note("1", "A", "  ")} onSave={onSave} onCancel={vi.fn()} onChange={vi.fn()} loading={false} />
    );
    fireEvent.click(screen.getByRole("button", { name: /zapisz/i }));
    expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ folder: null }));
  });

  it("zmiana pola folderu przekazuje notatkę z nowym folderem", () => {
    const onChange = vi.fn();
    render(
      <NoteEditForm note={note("1", "A")} onSave={vi.fn()} onCancel={vi.fn()} onChange={onChange} loading={false} />
    );
    fireEvent.change(screen.getByLabelText("Folder (opcjonalnie):"), { target: { value: "Dom" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ folder: "Dom" }));
  });
});

describe("NoteForm – folder", () => {
  it("nowa notatka zapisuje znormalizowany folder, a istniejące foldery są podpowiedziami", async () => {
    const { container } = render(<NoteForm onChange={vi.fn()} />);
    expect([...container.querySelectorAll("#note-folders option")].map((o) => o.getAttribute("value"))).toEqual([
      "Dom",
      "Fundacje",
      "Fundacje/FPMSK",
      "Fundacje/Zapłon",
    ]);
    fireEvent.change(screen.getByLabelText("Tytuł:"), { target: { value: "Nowa" } });
    fireEvent.change(screen.getByLabelText("Treść:"), { target: { value: "linia" } });
    fireEvent.change(screen.getByLabelText("Folder (opcjonalnie):"), { target: { value: " Fundacje / Zapłon " } });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await vi.waitFor(() => expect(h.addNote).toHaveBeenCalledTimes(1));
    expect(h.addNote).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Nowa", folder: "Fundacje/Zapłon", items: ["linia"] })
    );
  });

  it("bez folderu zapisuje null", async () => {
    const { container } = render(<NoteForm onChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Tytuł:"), { target: { value: "Nowa" } });
    fireEvent.change(screen.getByLabelText("Treść:"), { target: { value: "linia" } });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await vi.waitFor(() => expect(h.addNote).toHaveBeenCalled());
    expect(h.addNote).toHaveBeenCalledWith(expect.objectContaining({ folder: null }));
  });
});
