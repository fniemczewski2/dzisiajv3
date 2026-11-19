// lib/mail/letterNotices.ts
//
// Rozpoznawanie powiadomień ePUAP / e-Doręczeń (UPO, UPP, dowód doręczenia) w nagłówkach wiadomości – podstawa
// propozycji wpisu w module Pisma. Rozpoznanie opiera się na słowach kluczowych w temacie i nadawcy (bez próbek
// powiadomień z obu systemów nie ma stałego wzorca); każdą propozycję użytkownik zatwierdza w formularzu.
// Data propozycji = data wiadomości (czas polski) – zwykle dzień złożenia pisma, od którego biegnie termin.

import type { MailMessageSummary } from "@/lib/mail/client";

export type LetterNoticeKind = "UPP" | "UPO" | "e-Doręczenia" | "ePUAP";

export interface LetterNotice {
  messageId: string;
  accountId: string;
  kind: LetterNoticeKind;
  subject: string;
  from: string;
  /** yyyy-MM-dd w strefie Europe/Warsaw; null – wiadomość bez daty. */
  date: string | null;
}

/** Frazy wyszukiwania u dostawcy (osobno – Graph $search nie obsługuje OR w cudzysłowie). */
export const LETTER_NOTICE_QUERIES = ["ePUAP", "e-Doręczenia", "UPO", "UPP"] as const;

const RULES: ReadonlyArray<{ kind: LetterNoticeKind; re: RegExp }> = [
  { kind: "UPP", re: /\bUPP\b|po[sś]wiadczeni\w* przed[lł]o[zż]enia/i },
  { kind: "UPO", re: /\bUPO\b|po[sś]wiadczeni\w* odbioru/i },
  { kind: "e-Doręczenia", re: /e-?dor[eę]cze[nń]|dow[oó]d (otrzymania|doręczenia|wys[lł]ania)/i },
  { kind: "ePUAP", re: /\bepuap\b/i },
];

export function classifyNotice(text: string): LetterNoticeKind | null {
  return RULES.find((r) => r.re.test(text))?.kind ?? null;
}

function warsawDay(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(d);
}

/** Wiadomości → propozycje (bez duplikatów, najnowsze pierwsze). */
export function toLetterNotices(accountId: string, messages: readonly MailMessageSummary[]): LetterNotice[] {
  const seen = new Set<string>();
  const out: LetterNotice[] = [];
  for (const m of messages) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    const kind = classifyNotice(`${m.subject} ${m.from}`);
    if (kind) out.push({ messageId: m.id, accountId, kind, subject: m.subject, from: m.from, date: warsawDay(m.date) });
  }
  return out.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}
