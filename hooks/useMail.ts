// hooks/useMail.ts
//
// Dane modułu poczty przez TanStack Query (jak pozostałe moduły): deduplikacja żądań i cache w pamięci.
// Klucze zaczynają się od "mail" – lib/queryPersister nie zapisuje ich w IndexedDB (treść tylko w pamięci).

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createMailClient } from "@/lib/mail/client";

export const MAIL_KEYS = {
  all: ["mail"] as const,
  accounts: ["mail", "accounts"] as const,
  messages: (accountId: string, query: string) => ["mail", "messages", accountId, query] as const,
  messagesOf: (accountId: string) => ["mail", "messages", accountId] as const,
  message: (accountId: string, id: string) => ["mail", "message", accountId, id] as const,
  forwarding: ["mail", "forwarding"] as const,
  inbox: ["mail", "inbox"] as const,
};

/** Lista i konta: minuta; treść wiadomości (z obrazami osadzonymi): 5 minut. */
const LIST_STALE_MS = 60_000;
const MESSAGE_STALE_MS = 5 * 60_000;

export function useMailClient() {
  return useMemo(() => createMailClient(), []);
}

export function useMailAccounts() {
  const client = useMailClient();
  return useQuery({ queryKey: MAIL_KEYS.accounts, queryFn: () => client.listAccounts(), staleTime: LIST_STALE_MS });
}

export function useMailMessages(accountId: string | null, query: string) {
  const client = useMailClient();
  return useQuery({
    queryKey: MAIL_KEYS.messages(accountId ?? "", query),
    queryFn: () => client.listMessages(accountId as string, query),
    enabled: Boolean(accountId),
    staleTime: LIST_STALE_MS,
  });
}

export function useMailMessage(accountId: string | null, id: string | null) {
  const client = useMailClient();
  return useQuery({
    queryKey: MAIL_KEYS.message(accountId ?? "", id ?? ""),
    queryFn: () => client.getMessage(accountId as string, id as string),
    enabled: Boolean(accountId && id),
    staleTime: MESSAGE_STALE_MS,
  });
}

export function useMailForwarding(enabled: boolean) {
  const client = useMailClient();
  return useQuery({
    queryKey: MAIL_KEYS.forwarding,
    queryFn: () => client.listForwarding(),
    enabled,
    staleTime: LIST_STALE_MS,
  });
}

export function useMailInbox(enabled: boolean) {
  const client = useMailClient();
  return useQuery({ queryKey: MAIL_KEYS.inbox, queryFn: () => client.listInbox(), enabled, staleTime: LIST_STALE_MS });
}

export function useMailCache() {
  return useQueryClient();
}
