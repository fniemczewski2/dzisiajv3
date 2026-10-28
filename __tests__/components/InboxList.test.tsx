// __tests__/components/InboxList.test.tsx

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InboxList from "@/components/mail/InboxList";
import type { InboxItem } from "@/lib/mail/client";

const base: InboxItem = {
  id: "i1",
  from: "anna@example.com",
  subject: "Spotkanie",
  text: "Zapraszam.",
  html: null,
  receivedAt: "2026-10-26T10:00:00.000Z",
  expiresAt: "2026-10-29T10:00:00.000Z",
  invitation: null,
};

const handlers = () => ({ onTask: vi.fn(), onEvent: vi.fn(), onDelete: vi.fn(), busy: false, searching: false });

describe("InboxList", () => {
  it("bez zaproszenia nie pokazuje dodania do kalendarza", () => {
    render(<InboxList items={[base]} {...handlers()} />);
    expect(screen.queryByRole("button", { name: "dodaj Wydarzenie" })).toBeNull();
    expect(screen.getByRole("button", { name: "dodaj Zadanie" })).toBeInTheDocument();
  });

  it("zaproszenie z terminem pokazuje dodanie do kalendarza i je wywołuje", () => {
    const h = handlers();
    render(
      <InboxList
        items={[
          {
            ...base,
            invitation: {
              source: "ics",
              title: "Przegląd",
              start: "2026-10-27T10:00:00Z",
              end: null,
              allDay: false,
              location: null,
              conferenceLinks: [],
            },
          },
        ]}
        {...h}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "dodaj Wydarzenie" }));
    expect(h.onEvent).toHaveBeenCalledWith("i1");
  });

  it("usunięcie wywołuje obsługę z identyfikatorem", () => {
    const h = handlers();
    render(<InboxList items={[base]} {...h} />);
    fireEvent.click(screen.getByRole("button", { name: "Usuń wiadomość Spotkanie" }));
    expect(h.onDelete).toHaveBeenCalledWith("i1");
  });

  it("pusta skrzynka pokazuje komunikat", () => {
    render(<InboxList items={[]} {...handlers()} />);
    expect(screen.getByText(/Brak przekierowanych wiadomości/)).toBeInTheDocument();
  });
});
