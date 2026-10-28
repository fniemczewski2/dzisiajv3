// __tests__/components/MessageDetail.test.tsx
//
// Odpowiedź: podgląd, potem toast.confirm. Odmowa w potwierdzeniu = brak wysyłki.

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), confirm: vi.fn(async () => true) }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ toast }) }));

import MessageDetail from "@/components/mail/MessageDetail";
import type { MailClient, MailMessageFull } from "@/lib/mail/client";

const message: MailMessageFull = {
  id: "m1",
  threadId: "t1",
  subject: "Spotkanie",
  from: "Anna <anna@example.com>",
  to: "ja@x.pl",
  date: null,
  text: "Zapraszam.",
  html: null,
  inlineImages: {},
  attachments: [],
};

function makeClient(): MailClient {
  return {
    sendReply: vi.fn(async () => ({ sentId: "s1" })),
    createTask: vi.fn(async () => ({ taskId: "t" })),
    createEvent: vi.fn(async () => ({ eventId: "e" })),
  } as unknown as MailClient;
}

function writeAndPreview(text: string) {
  fireEvent.change(screen.getByLabelText("Treść odpowiedzi"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Podgląd odpowiedzi" }));
}

beforeEach(() => {
  Object.values(toast).forEach((fn) => fn.mockClear());
  toast.confirm.mockResolvedValue(true);
});

describe("MessageDetail – odpowiedź", () => {
  it("przycisk Wyślij pojawia się dopiero po podglądzie", () => {
    render(
      <MessageDetail client={makeClient()} accountId="a1" message={message} invitation={null} onDelete={vi.fn()} />
    );
    expect(screen.queryByRole("button", { name: "Wyślij" })).toBeNull();
    writeAndPreview("Dziękuję");
    expect(screen.getByRole("button", { name: "Wyślij" })).toBeEnabled();
  });

  it("po potwierdzeniu wysyła i pokazuje sukces", async () => {
    const client = makeClient();
    render(<MessageDetail client={client} accountId="a1" message={message} invitation={null} onDelete={vi.fn()} />);
    writeAndPreview("Dziękuję");
    fireEvent.click(screen.getByRole("button", { name: "Wyślij" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Odpowiedź wysłana."));
    expect(toast.confirm).toHaveBeenCalledWith(expect.stringContaining("anna@example.com"));
    expect(client.sendReply).toHaveBeenCalledWith({ accountId: "a1", messageId: "m1", body: "Dziękuję" });
  });

  it("odmowa w potwierdzeniu nie wysyła", async () => {
    toast.confirm.mockResolvedValue(false);
    const client = makeClient();
    render(<MessageDetail client={client} accountId="a1" message={message} invitation={null} onDelete={vi.fn()} />);
    writeAndPreview("Dziękuję");
    fireEvent.click(screen.getByRole("button", { name: "Wyślij" }));
    await waitFor(() => expect(toast.confirm).toHaveBeenCalled());
    expect(client.sendReply).not.toHaveBeenCalled();
  });

  it("zmiana treści po podglądzie wymaga ponownego podglądu", () => {
    render(
      <MessageDetail client={makeClient()} accountId="a1" message={message} invitation={null} onDelete={vi.fn()} />
    );
    writeAndPreview("A");
    fireEvent.change(screen.getByLabelText("Treść odpowiedzi"), { target: { value: "B" } });
    expect(screen.queryByRole("button", { name: "Wyślij" })).toBeNull();
  });

  it("błąd wysyłki pokazuje komunikat serwera z przyczyną", async () => {
    const client = makeClient();
    (client.sendReply as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Za dużo wysłanych wiadomości."));
    render(<MessageDetail client={client} accountId="a1" message={message} invitation={null} onDelete={vi.fn()} />);
    writeAndPreview("x");
    fireEvent.click(screen.getByRole("button", { name: "Wyślij" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Za dużo wysłanych wiadomości.",
        expect.objectContaining({ cause: expect.any(Error) })
      )
    );
  });
});

describe("MessageDetail – zadanie i zaproszenie", () => {
  it("zaproszenie z terminem pokazuje dodanie do kalendarza", async () => {
    const client = makeClient();
    render(
      <MessageDetail
        client={client}
        accountId="a1"
        onDelete={vi.fn()}
        message={message}
        invitation={{
          source: "ics",
          title: "Przegląd",
          start: "2026-10-27T10:00:00Z",
          end: null,
          allDay: false,
          location: "Sala 3",
          conferenceLinks: [],
        }}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "dodaj Wydarzenie" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Dodano wydarzenie do kalendarza."));
    expect(client.createEvent).toHaveBeenCalledWith("a1", "m1");
  });

  it("dodanie zadania", async () => {
    const client = makeClient();
    render(<MessageDetail client={client} accountId="a1" message={message} invitation={null} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "dodaj Zadanie" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Dodano zadanie."));
    expect(client.createTask).toHaveBeenCalledWith("a1", "m1");
  });
});

describe("MessageDetail – usuwanie", () => {
  it("przycisk usuwania wywołuje obsługę strony", () => {
    const onDelete = vi.fn();
    render(
      <MessageDetail client={makeClient()} accountId="a1" message={message} invitation={null} onDelete={onDelete} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Usuń wiadomość" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
