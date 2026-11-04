// lib/mail/unified.ts
//
// Wspólny widok skrzynek: wiadomości ze wszystkich połączonych kont i przekierowane w jednej liście, od najnowszych.

import type { InboxItem, MailAccount, MailMessageSummary } from "@/lib/mail/client";

export type UnifiedMailItem =
  | {
      kind: "account";
      key: string;
      date: string | null;
      accountId: string;
      /** Adres konta – etykieta źródła na liście. */
      accountLabel: string;
      message: MailMessageSummary;
    }
  | { kind: "forwarded"; key: string; date: string; item: InboxItem };

const time = (iso: string | null): number => {
  const ms = iso ? Date.parse(iso) : Number.NaN;
  return Number.isNaN(ms) ? 0 : ms;
};

/** Wiadomości kont (lista na konto, w kolejności `accounts`) i przekierowane – od najnowszych; bez daty na końcu. */
export function mergeMail(
  accounts: readonly Pick<MailAccount, "id" | "email">[],
  messagesByAccount: readonly (readonly MailMessageSummary[] | undefined)[],
  inbox: readonly InboxItem[]
): UnifiedMailItem[] {
  const items: UnifiedMailItem[] = [];
  accounts.forEach((account, index) => {
    for (const message of messagesByAccount[index] ?? []) {
      items.push({
        kind: "account",
        key: `account:${account.id}:${message.id}`,
        date: message.date,
        accountId: account.id,
        accountLabel: account.email,
        message,
      });
    }
  });
  for (const item of inbox) items.push({ kind: "forwarded", key: `forwarded:${item.id}`, date: item.receivedAt, item });
  // Sortowanie stabilne: przy równych datach zachowana kolejność (konta w porządku listy, potem przekierowane).
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => time(b.item.date) - time(a.item.date) || a.index - b.index)
    .map(({ item }) => item);
}

/** Lokalne wyszukiwanie w przekierowanych (nadawca, temat, treść) – bufor nie ma wyszukiwania po stronie dostawcy. */
export function filterInbox(inbox: readonly InboxItem[], query: string): InboxItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...inbox];
  return inbox.filter((i) => `${i.from}\n${i.subject}\n${i.text}`.toLowerCase().includes(q));
}
