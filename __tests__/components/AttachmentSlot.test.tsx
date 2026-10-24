// __tests__/components/AttachmentSlot.test.tsx

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttachmentSlot } from "@/components/letters/LetterList";
import { MAX_LETTER_ATTACHMENTS } from "@/config/limits";
import type { LetterAttachment } from "@/types/letters";

const getLetterFileUrl = vi.fn();
const addLetterAttachments = vi.fn();
const removeLetterAttachment = vi.fn();

vi.mock("@/hooks/db/useLetters", () => ({
  useLetters: () => ({ addLetterAttachments, removeLetterAttachment, getLetterFileUrl }),
}));

const att = (id: string, name = `${id}.pdf`): LetterAttachment => ({
  id,
  letter_id: "L1",
  user_id: "u1",
  kind: "letter",
  storage_path: `u1/L1/letter-${id}.pdf`,
  file_name: name,
  size_bytes: 10,
  created_at: "2026-10-22T10:00:00Z",
});

const list = (n: number) => Array.from({ length: n }, (_, i) => att(`a${i}`));

beforeEach(() => {
  getLetterFileUrl.mockReset();
  addLetterAttachments.mockReset();
  removeLetterAttachment.mockReset();
});

describe("AttachmentSlot – podgląd (regresja: noopener/noreferrer zerowało window.open)", () => {
  it("otwiera kartę PRZED pobraniem linku, bez noopener/noreferrer", async () => {
    const fakeWindow = { location: { href: "" }, close: vi.fn(), opener: "something" };
    vi.spyOn(window, "open").mockReturnValue(fakeWindow as unknown as Window);
    getLetterFileUrl.mockResolvedValue("https://example.supabase.co/sign/foo.pdf?token=abc");

    render(<AttachmentSlot label="Pismo" kind="letter" letterId="L1" attachments={[att("a1", "pismo.pdf")]} />);
    await userEvent.click(screen.getByRole("button", { name: "Podgląd: pismo.pdf" }));

    expect(window.open).toHaveBeenCalledWith("", "_blank");
    expect(fakeWindow.location.href).toBe("https://example.supabase.co/sign/foo.pdf?token=abc");
    expect(fakeWindow.opener).toBeNull();
    expect(getLetterFileUrl).toHaveBeenCalledWith("u1/L1/letter-a1.pdf");
  });

  it("zamyka kartę, gdy nie ma linku", async () => {
    const fakeWindow = { location: { href: "" }, close: vi.fn(), opener: null };
    vi.spyOn(window, "open").mockReturnValue(fakeWindow as unknown as Window);
    getLetterFileUrl.mockResolvedValue(null);

    render(<AttachmentSlot label="Pismo" kind="letter" letterId="L1" attachments={[att("a1")]} />);
    await userEvent.click(screen.getByRole("button", { name: /Podgląd/ }));

    expect(fakeWindow.close).toHaveBeenCalled();
  });
});

describe("AttachmentSlot – wiele plików", () => {
  it("pokazuje każdy załącznik z nazwą i licznik x/limit", () => {
    render(<AttachmentSlot label="Odpowiedź" kind="response" letterId="L1" attachments={list(2)} />);
    expect(screen.getByText("a0.pdf")).toBeInTheDocument();
    expect(screen.getByText("a1.pdf")).toBeInTheDocument();
    expect(screen.getByText(`2/${MAX_LETTER_ATTACHMENTS}`)).toBeInTheDocument();
  });

  it("wybór kilku plików przekazuje wszystkie naraz", async () => {
    addLetterAttachments.mockResolvedValue(2);
    const { container } = render(<AttachmentSlot label="Pismo" kind="letter" letterId="L1" attachments={[]} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toHaveAttribute("multiple");
    const files = [
      new File(["a"], "a.pdf", { type: "application/pdf" }),
      new File(["b"], "b.pdf", { type: "application/pdf" }),
    ];
    await userEvent.upload(input, files);
    expect(addLetterAttachments).toHaveBeenCalledWith("L1", "letter", files);
  });

  it("po osiągnięciu limitu ukrywa „Dodaj PDF” i pokazuje komunikat", () => {
    render(<AttachmentSlot label="Pismo" kind="letter" letterId="L1" attachments={list(MAX_LETTER_ATTACHMENTS)} />);
    expect(screen.queryByRole("button", { name: /Dodaj PDF/ })).toBeNull();
    expect(screen.getByText(`Osiągnięto limit ${MAX_LETTER_ATTACHMENTS} plików.`)).toBeInTheDocument();
  });

  it("usunięcie przekazuje dokładnie ten załącznik", async () => {
    removeLetterAttachment.mockResolvedValue(undefined);
    const target = att("a1", "druga.pdf");
    render(<AttachmentSlot label="Pismo" kind="letter" letterId="L1" attachments={[att("a0"), target]} />);
    await userEvent.click(screen.getByRole("button", { name: "Usuń załącznik: druga.pdf" }));
    expect(removeLetterAttachment).toHaveBeenCalledWith(target);
  });
});
