// __tests__/pages/api/mailInboundTickets.test.ts
//
// Adres biletów (b-…): bilet → „Pociągi”; wiadomość bez biletu (np. kod weryfikacyjny Gmaila) → bufor Poczty, nie zwrot.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

const h = vi.hoisted(() => ({
  ticket: { added: 0, duplicates: 0, unreadable: 0, addedRows: [], diagnostics: [] as string[] },
  inserts: [] as { table: string; row: Record<string, unknown> }[],
  closedAt: null as string | null,
  updates: [] as Record<string, unknown>[],
}));

vi.mock("@/config/env", () => ({ serverEnv: { mailInboundSecret: "s3cret", mailForwardingDomain: "poczta.test" } }));
vi.mock("@/lib/server/rateLimit", () => ({ enforceRateLimit: async () => true, clientIp: () => "1.1.1.1" }));
vi.mock("@/lib/server/tokenCrypto", () => ({ encryptToken: (v: string) => `enc:${v}` }));
vi.mock("@/lib/server/ticketInbound", () => ({ importTicketMail: async () => h.ticket }));
vi.mock("@/lib/server/supabaseAdmin", () => ({
  supabaseAdmin: () => ({
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        is: () => query,
        maybeSingle: async () => ({ data: { id: "f1", user_id: "u1", buffer_closed_at: h.closedAt } }),
        update: (row: Record<string, unknown>) => {
          h.updates.push(row);
          return { eq: () => ({ is: async () => ({ error: null }) }) };
        },
        insert: async (row: Record<string, unknown>) => {
          h.inserts.push({ table, row });
          return { error: null };
        },
      };
      return query;
    },
  }),
}));

import handler from "@/pages/api/mail/inbound";

const TOKEN = "a".repeat(32);

function call(recipient: string, from = "znajomy@example.com", subject = "Cześć") {
  const req = {
    method: "POST",
    headers: { "x-mail-inbound-secret": "s3cret" },
    body: { recipient, from, subject, text: "Kod: 123" },
  } as unknown as NextApiRequest;
  const res = {
    statusCode: 200,
    payload: undefined as unknown,
    setHeader: vi.fn(),
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(p: unknown) {
      this.payload = p;
      return this;
    },
    end() {
      return this;
    },
  };
  return { req, res: res as unknown as NextApiResponse & { statusCode: number; payload: Record<string, unknown> } };
}

beforeEach(() => {
  h.ticket = { added: 0, duplicates: 0, unreadable: 0, addedRows: [], diagnostics: [] };
  h.inserts = [];
  h.closedAt = null;
  h.updates = [];
});

describe("/api/mail/inbound – adres biletów", () => {
  it("wiadomość bez biletu trafia do bufora Poczty (202), nie wraca do nadawcy", async () => {
    const { req, res } = call(`b-${TOKEN}@poczta.test`);
    await handler(req, res);
    expect(res.statusCode).toBe(202);
    expect(res.payload).toMatchObject({ added: 0, duplicates: 0, buffered: true, bufferClosed: false });
    // Nadawca dostaje odpowiedź z bramki (pole `notice`), a nie zwrotkę SMTP.
    expect((res.payload as { notice: { subject: string } }).notice.subject).toBe("Bilet: brak danych do dodania");
    expect(h.inserts).toHaveLength(1);
    expect(h.inserts[0]).toMatchObject({ table: "mail_inbox", row: { user_id: "u1", forwarding_id: "f1" } });
    expect(h.updates).toHaveLength(0);
  });

  it("mail weryfikacyjny Gmaila trafia do bufora i zamyka bufor", async () => {
    const { req, res } = call(
      `b-${TOKEN}@poczta.test`,
      "Zespół Gmail <forwarding-noreply@google.com>",
      "(#123456) Potwierdzenie przekazywania w Gmailu"
    );
    await handler(req, res);
    // Mail weryfikacyjny Gmaila: bez odpowiedzi (trafiłaby do robota Google).
    expect(res.payload).toEqual({ added: 0, duplicates: 0, buffered: true, bufferClosed: true });
    expect(h.inserts).toHaveLength(1);
    expect(h.updates).toEqual([{ buffer_closed_at: expect.any(String) }]);
  });

  it("po zamknięciu bufora mail bez rozpoznanego biletu → 202 i bufor (bez zwrotki SMTP)", async () => {
    h.closedAt = "2026-11-20T10:00:00Z";
    const { req, res } = call(`b-${TOKEN}@poczta.test`);
    await handler(req, res);
    // Odrzucenie kończyło się zwrotką z serwera nadawcy i utratą biletu – wiadomość zostaje w Poczcie.
    expect(res.statusCode).toBe(202);
    expect(res.payload).toMatchObject({ buffered: true });
    expect(h.inserts).toHaveLength(1);
  });

  it("rozpoznany bilet – bez zapisu treści w buforze", async () => {
    h.ticket = { added: 2, duplicates: 0, unreadable: 0, addedRows: [], diagnostics: [] };
    const { req, res } = call(`b-${TOKEN}@poczta.test`);
    await handler(req, res);
    expect(res.statusCode).toBe(202);
    // `addedRows` zostaje w aplikacji; bramka dostaje podsumowanie i gotową treść odpowiedzi.
    expect(res.payload).toMatchObject({ added: 2, duplicates: 0, unreadable: 0 });
    expect((res.payload as { notice: { subject: string } }).notice.subject).toContain("dodano 2");
    expect(h.inserts).toHaveLength(0);
    expect(h.updates).toHaveLength(1);
  });

  it("adres poczty (p-…) – bufor jak dotąd", async () => {
    const { req, res } = call(`p-${TOKEN}@poczta.test`);
    await handler(req, res);
    expect(res.statusCode).toBe(202);
    expect(h.inserts).toHaveLength(1);
  });
});
