// __tests__/lib/mail/unified.test.ts

import { describe, it, expect } from "vitest";
import { filterInbox, mergeMail } from "@/lib/mail/unified";
import type { InboxItem, MailMessageSummary } from "@/lib/mail/client";

const msg = (id: string, date: string | null, subject = id): MailMessageSummary => ({
  id,
  threadId: `t${id}`,
  subject,
  from: "x@x.pl",
  date,
});
const inbox = (id: string, receivedAt: string, subject = id, text = ""): InboxItem => ({
  id,
  from: "f@x.pl",
  subject,
  text,
  html: null,
  receivedAt,
  expiresAt: "2026-12-01T00:00:00Z",
  invitation: null,
});
const accounts = [
  { id: "a1", email: "pierwsze@x.pl" },
  { id: "a2", email: "drugie@x.pl" },
];

describe("mergeMail", () => {
  it("wszystkie źródła w jednej liście od najnowszych, z kluczami i etykietą konta", () => {
    const merged = mergeMail(
      accounts,
      [[msg("m1", "2026-11-02T10:00:00Z")], [msg("m2", "2026-11-03T09:00:00Z")]],
      [inbox("i1", "2026-11-03T12:00:00Z")]
    );
    expect(merged.map((m) => m.key)).toEqual(["forwarded:i1", "account:a2:m2", "account:a1:m1"]);
    expect(merged[1]).toMatchObject({ kind: "account", accountId: "a2", accountLabel: "drugie@x.pl" });
  });

  it("wiadomość bez daty lub z niepoprawną datą trafia na koniec; równe daty zachowują kolejność kont", () => {
    const merged = mergeMail(
      accounts,
      [
        [msg("a", null), msg("b", "2026-11-01T00:00:00Z")],
        [msg("c", "nie data"), msg("d", "2026-11-01T00:00:00Z")],
      ],
      []
    );
    expect(merged.map((m) => (m.kind === "account" ? m.message.id : ""))).toEqual(["b", "d", "a", "c"]);
  });

  it("konto bez załadowanej listy (undefined) jest pomijane, brak danych daje pustą listę", () => {
    expect(mergeMail(accounts, [undefined, [msg("m", "2026-11-01T00:00:00Z")]], []).map((m) => m.key)).toEqual([
      "account:a2:m",
    ]);
    expect(mergeMail([], [], [])).toEqual([]);
  });
});

describe("filterInbox", () => {
  const items = [
    inbox("1", "2026-11-01T00:00:00Z", "Faktura za listopad", "kwota"),
    inbox("2", "2026-11-02T00:00:00Z", "Spotkanie", "w piątek"),
  ];

  it("puste zapytanie zwraca wszystko (kopię), zapytanie szuka w nadawcy, temacie i treści bez wielkości liter", () => {
    expect(filterInbox(items, "  ")).toEqual(items);
    expect(filterInbox(items, "FAKTURA").map((i) => i.id)).toEqual(["1"]);
    expect(filterInbox(items, "piątek").map((i) => i.id)).toEqual(["2"]);
    expect(filterInbox(items, "f@x.pl")).toHaveLength(2);
    expect(filterInbox(items, "brak takiego")).toEqual([]);
  });
});
