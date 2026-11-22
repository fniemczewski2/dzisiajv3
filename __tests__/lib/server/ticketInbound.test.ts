// __tests__/lib/server/ticketInbound.test.ts

import { describe, it, expect, vi } from "vitest";
import { importTicketMail } from "@/lib/server/ticketInbound";
import type { InboundMessage } from "@/lib/mail/inbound";
import type { SupabaseClient } from "@supabase/supabase-js";

const TEXT = [
  "Poznań Gł. Warszawa Centr.",
  "Data odjazdu / przyjazdu: 26.11.2026 26.11.2026",
  "Godzina odjazdu / przyjazdu: 06:36 09:00 Czas: 2g 24min",
  "Pociąg: 6112 Lech",
  "Wagon: 15, klasa 2",
  "Miejsca: 14 ś Przy stoliku",
].join("\n");

function fakeAdmin(existing: unknown[], insertErrors: ({ code: string } | null)[] = []) {
  let call = 0;
  const insert = vi.fn(async () => ({ error: insertErrors[call++] ?? null }));
  const select = {
    eq: () => select,
    in: async () => ({ data: existing, error: null }),
  };
  const admin = { from: () => ({ select: () => select, insert }) } as unknown as SupabaseClient;
  return { admin, insert };
}

const message = (pdfs: string[]): InboundMessage => ({
  recipient: "b-x@d",
  from: "bilet@intercity.pl",
  subject: "Bilet",
  text: "",
  html: null,
  attachments: pdfs.map((p, i) => ({
    attachmentId: `inbound-${i}`,
    filename: "b.pdf",
    mimeType: "application/pdf",
    pdfBase64: p,
  })),
});

describe("importTicketMail", () => {
  it("dodaje odcinek z PDF", async () => {
    const { admin, insert } = fakeAdmin([]);
    const result = await importTicketMail(admin, "u1", message(["QQ=="]), async () => TEXT);
    expect(result).toMatchObject({ added: 1, duplicates: 0, unreadable: 0 });
    expect(result.addedRows).toHaveLength(1);
    expect(insert).toHaveBeenCalledWith([expect.objectContaining({ train_number: "6112", needs_review: true })]);
  });

  it("drugi raz ten sam bilet – bez duplikatu", async () => {
    const { admin, insert } = fakeAdmin([
      { date: "2026-11-26", train_number: "6112", departure_time: "06:36", wagon: "15", seat: "14" },
    ]);
    const result = await importTicketMail(admin, "u1", message(["QQ==", "QQ=="]), async () => TEXT);
    expect(result).toMatchObject({ added: 0, duplicates: 2, unreadable: 0 });
    expect(insert).not.toHaveBeenCalled();
  });

  it("PDF bez biletu lub z błędem odczytu", async () => {
    const { admin } = fakeAdmin([]);
    const failing = vi.fn().mockResolvedValueOnce("Faktura").mockRejectedValueOnce(new Error("pdf"));
    const result = await importTicketMail(admin, "u1", message(["QQ==", "QQ=="]), failing);
    expect(result).toMatchObject({ added: 0, duplicates: 0, unreadable: 2 });
  });

  it("godzina z bazy w formacie HH:MM:SS liczy się jako duplikat", async () => {
    const { admin, insert } = fakeAdmin([
      { date: "2026-11-26", train_number: "6112", departure_time: "06:36:00", wagon: "15", seat: "14" },
    ]);
    const result = await importTicketMail(admin, "u1", message(["QQ=="]), async () => TEXT);
    expect(result).toMatchObject({ added: 0, duplicates: 1 });
    expect(insert).not.toHaveBeenCalled();
  });

  it("kolizja z indeksem dedupe nie przepada jako błąd", async () => {
    const { admin } = fakeAdmin([], [{ code: "23505" }]);
    const result = await importTicketMail(admin, "u1", message(["QQ=="]), async () => TEXT);
    expect(result).toMatchObject({ added: 0, duplicates: 1, unreadable: 0 });
  });
});
