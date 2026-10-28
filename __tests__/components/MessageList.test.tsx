// __tests__/components/MessageList.test.tsx

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MessageList from "@/components/mail/MessageList";

const msg = { id: "m1", threadId: "t", subject: "Faktura", from: "Anna <anna@x.pl>", date: null };

describe("MessageList", () => {
  it("usuwanie z wiersza nie otwiera wiadomości", () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    render(
      <MessageList
        messages={[msg]}
        selectedId={null}
        onSelect={onSelect}
        onDelete={onDelete}
        loading={false}
        searching={false}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Usuń wiadomość Faktura" }));
    expect(onDelete).toHaveBeenCalledWith(msg);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("wiersz pokazuje nazwę nadawcy i temat", () => {
    render(
      <MessageList
        messages={[msg]}
        selectedId={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        loading={false}
        searching={false}
      />
    );
    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.getByText("Faktura")).toBeInTheDocument();
  });
});
