// __tests__/lib/mail/ticketNotice.test.ts

import { describe, it, expect } from "vitest";
import { ticketNoticeBody, ticketNoticeSubject, type TicketNotice } from "@/lib/mail/ticketNotice";
import type { TrainRow } from "@/lib/server/ticketInbound";

const row: TrainRow = {
  user_id: "u1",
  train_number: "6112",
  train_name: "Lech",
  date: "2026-11-26",
  departure_time: "06:36",
  from_station: "Poznań Główny",
  to_station: "Warszawa Centralna",
  wagon: "15",
  seat: "14",
  source: "mail",
  needs_review: true,
};

describe("ticketNotice", () => {
  it("dodany odcinek w temacie i treści", () => {
    const notice: TicketNotice = {
      ok: true,
      result: { added: 1, duplicates: 0, unreadable: 0, addedRows: [row], diagnostics: [] },
    };
    expect(ticketNoticeSubject(notice)).toContain("dodano 1");
    const body = ticketNoticeBody(notice, "Bilet PKP Intercity");
    expect(body).toContain("6112 Lech");
    expect(body).toContain("Poznań Główny → Warszawa Centralna");
    expect(body).toContain("Bilet PKP Intercity");
  });

  it("duplikat i nierozpoznany załącznik", () => {
    const notice: TicketNotice = {
      ok: true,
      result: {
        added: 0,
        duplicates: 1,
        unreadable: 2,
        addedRows: [],
        diagnostics: ["PDF 1: brak warstwy tekstowej (0 znaków) – prawdopodobnie skan lub obraz."],
      },
    };
    expect(ticketNoticeSubject(notice)).toBe("Bilet: już był w aplikacji");
    expect(ticketNoticeBody(notice, "")).toContain("Pominięto jako już zapisane: 1.");
    expect(ticketNoticeBody(notice, "")).toContain("bez rozpoznanego biletu PKP Intercity: 2.");
    expect(ticketNoticeBody(notice, "")).toContain("brak warstwy tekstowej");
  });

  it("błąd zapisu", () => {
    const notice: TicketNotice = { ok: false, reason: "duplicate key" };
    expect(ticketNoticeSubject(notice)).toBe("Bilet: nie udało się dodać");
    expect(ticketNoticeBody(notice, "Bilet")).toContain("Błąd zapisu biletu: duplicate key");
  });
});
