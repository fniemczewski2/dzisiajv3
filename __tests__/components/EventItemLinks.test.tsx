// Linki w wydarzeniach (opis i miejsce) są klikalne tak jak w notatkach.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EventItem from "@/components/calendar/EventItem";
import type { Event } from "@/types/events";

vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ supabase: { rpc: vi.fn() } }) }));
vi.mock("@/hooks/useEventConflicts", () => ({ useEventConflicts: () => ({ report: null, hasOverlaps: false }) }));
vi.mock("@/hooks/useTaskCategories", () => ({ useCategoryColors: () => ({}) }));

const base: Event = {
  id: "e1",
  title: "Spotkanie",
  start_time: "2026-10-22T10:00:00",
  end_time: "2026-10-22T11:00:00",
  user_id: "u",
  repeat: "none",
};

const renderEvent = (patch: Partial<Event>) =>
  render(
    <EventItem
      event={{ ...base, ...patch }}
      loading={false}
      onEditEvent={vi.fn()}
      onDeleteEvent={vi.fn()}
      onEventsChange={vi.fn()}
      userOptions={[]}
    />
  );

describe("EventItem – linki", () => {
  it("opis z adresem ma klikalny link w nowej karcie", () => {
    renderEvent({ description: "Agenda: https://docs.example.com/a?b=1 oraz uwagi" });
    const link = screen.getByRole("link", { name: "docs.example.com/a?b=1" });
    expect(link).toHaveAttribute("href", "https://docs.example.com/a?b=1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("miejsce będące samym adresem zostaje „Linkiem do spotkania”", () => {
    renderEvent({ place: "https://meet.example.com/abc" });
    expect(screen.getByRole("link", { name: /Link do spotkania/ })).toHaveAttribute(
      "href",
      "https://meet.example.com/abc"
    );
  });

  it("miejsce z adresem w tekście ma klikalny link", () => {
    renderEvent({ place: "Sala 3, online: https://zoom.us/j/1" });
    expect(screen.getByRole("link", { name: "zoom.us/j/1" })).toHaveAttribute("href", "https://zoom.us/j/1");
  });

  it("miejsce http:// też jest linkiem, a zwykły tekst nim nie jest", () => {
    renderEvent({ place: "http://intranet.local/sala" });
    expect(screen.getByRole("link", { name: /Link do spotkania/ })).toBeInTheDocument();
  });

  it("zwykłe miejsce i opis bez adresu nie tworzą linków", () => {
    renderEvent({ place: "Biuro, sala 3.B", description: "Omówienie planu" });
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Biuro, sala 3.B")).toBeInTheDocument();
  });

  it("niebezpieczny schemat w miejscu nie staje się linkiem", () => {
    renderEvent({ place: "javascript:alert(1)" });
    expect(screen.queryByRole("link")).toBeNull();
  });
});
