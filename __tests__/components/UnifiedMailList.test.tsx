// __tests__/components/UnifiedMailList.test.tsx

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/hooks/useResponsive", () => ({ useResponsive: () => false }));

import UnifiedMailList from "@/components/mail/UnifiedMailList";
import type { UnifiedMailItem } from "@/lib/mail/unified";

const accountItem: UnifiedMailItem = {
  kind: "account",
  key: "account:a1:m1",
  date: "2026-11-02T10:00:00Z",
  accountId: "a1",
  accountLabel: "pierwsze@x.pl",
  message: { id: "m1", threadId: "t", subject: "Faktura", from: "Biuro <biuro@x.pl>", date: "2026-11-02T10:00:00Z" },
};
const forwardedItem: UnifiedMailItem = {
  kind: "forwarded",
  key: "forwarded:i1",
  date: "2026-11-03T12:00:00Z",
  item: {
    id: "i1",
    from: "Fundacja <f@x.pl>",
    subject: "Przekierowany",
    text: "treść przekierowanego listu",
    html: null,
    receivedAt: "2026-11-03T12:00:00Z",
    expiresAt: "2026-11-06T12:00:00Z",
    invitation: null,
  },
};

function renderList(over: Partial<React.ComponentProps<typeof UnifiedMailList>> = {}) {
  const props = {
    items: [forwardedItem, accountItem],
    loading: false,
    searching: false,
    selected: null,
    onSelect: vi.fn(),
    onDeleteMessage: vi.fn(),
    onTask: vi.fn(),
    onEvent: vi.fn(),
    onDeleteInbox: vi.fn(),
    busy: false,
    ...over,
  };
  render(<UnifiedMailList {...props} />);
  return props;
}

describe("UnifiedMailList", () => {
  it("wiersz konta: wybór przekazuje konto i identyfikator, usunięcie – konto i wiadomość", () => {
    const props = renderList();
    fireEvent.click(screen.getByRole("button", { name: /^(?!Usuń).*Faktura/ }));
    expect(props.onSelect).toHaveBeenCalledWith("a1", "m1");
    fireEvent.click(screen.getByRole("button", { name: "Usuń wiadomość Faktura" }));
    expect(props.onDeleteMessage).toHaveBeenCalledWith(
      "a1",
      accountItem.kind === "account" ? accountItem.message : null
    );
  });

  it("zaznaczona wiadomość ma aria-current", () => {
    renderList({ selected: { accountId: "a1", id: "m1" } });
    expect(screen.getByRole("button", { name: /^(?!Usuń).*Faktura/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: /^(?!Usuń).*Przekierowany/ })).not.toHaveAttribute("aria-current");
  });

  it("wiersz przekierowany: etykieta źródła, rozwijanie treści i akcje", () => {
    const props = renderList();
    expect(screen.getByText("Przekierowanie")).toBeInTheDocument();
    expect(screen.queryByText("treść przekierowanego listu")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^(?!Usuń).*Przekierowany/ }));
    expect(screen.getByText("treść przekierowanego listu")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Usuń wiadomość Przekierowany" }));
    expect(props.onDeleteInbox).toHaveBeenCalledWith("i1");
    fireEvent.click(screen.getByRole("button", { name: /Zadanie/ }));
    expect(props.onTask).toHaveBeenCalledWith("i1");
  });

  it("stany: ładowanie, brak wiadomości", () => {
    const { unmount } = render(
      <UnifiedMailList
        items={[]}
        loading={true}
        searching={false}
        selected={null}
        onSelect={vi.fn()}
        onDeleteMessage={vi.fn()}
        onTask={vi.fn()}
        onEvent={vi.fn()}
        onDeleteInbox={vi.fn()}
        busy={false}
      />
    );
    expect(screen.queryByRole("list")).toBeNull();
    unmount();
    renderList({ items: [] });
    expect(screen.getByText(/Brak wiadomości do wyświetlenia/)).toBeInTheDocument();
  });
});
