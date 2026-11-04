// __tests__/pages/notesPage.test.tsx
//
// Strona Notatki: przycisk pobrania wszystkich notatek jako jeden plik Markdown.

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const h = vi.hoisted(() => ({ notes: [] as unknown[], downloadAll: vi.fn() }));

vi.mock("next/router", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/ui/SEO", () => ({ default: () => null }));
vi.mock("@/hooks/useQuickAction", () => ({ useQuickAction: () => undefined }));
vi.mock("@/components/notes/NoteList", () => ({ default: () => <div data-testid="lista" /> }));
vi.mock("@/hooks/db/useNotes", () => ({ useNotes: () => ({ notes: h.notes, fetching: false, fetchNotes: vi.fn() }) }));
vi.mock("@/lib/notes/export", () => ({ downloadAllNotesMarkdown: (n: unknown) => h.downloadAll(n) }));

import NotesPage from "@/pages/notes/index";

beforeEach(() => h.downloadAll.mockClear());

describe("strona Notatki – eksport Markdown", () => {
  it("przy istniejących notatkach przycisk pobiera wszystkie jako .md", () => {
    h.notes = [{ id: "1", title: "A", items: [], bg_color: "x", user_id: "u" }];
    render(<NotesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Pobierz plik .md" }));
    expect(h.downloadAll).toHaveBeenCalledWith(h.notes);
  });

  it("bez notatek przycisku eksportu nie ma", () => {
    h.notes = [];
    render(<NotesPage />);
    expect(screen.queryByRole("button", { name: "Pobierz plik .md" })).toBeNull();
  });
});
