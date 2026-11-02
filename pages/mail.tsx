// pages/mail.tsx
//
// Poczta: konta Gmail/Outlook (odczyt, odpowiedź po potwierdzeniu, zadanie, wydarzenie, usuwanie) oraz przekierowania.
// Dane przez TanStack Query (hooks/useMail.ts): konto i fraza są częścią klucza, więc zmiana wyszukiwania
// nie przełącza konta ani nie pobiera listy dwukrotnie. Treść nie jest zapisywana poza pamięcią.

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Seo from "@/components/ui/SEO";
import { ToggleChip } from "@/components/ui/CommonButtons";
import { useToast } from "@/providers/ToastProvider";
import MailAccountsPanel from "@/components/mail/MailAccountsPanel";
import MessageList from "@/components/mail/MessageList";
import MessageDetail from "@/components/mail/MessageDetail";
import ForwardingPanel from "@/components/mail/ForwardingPanel";
import InboxList from "@/components/mail/InboxList";
import NoResultsState from "@/components/ui/NoResultsState";
import SearchBar from "@/components/ui/SearchBar";
import { useResponsive } from "@/hooks/useResponsive";
import {
  useMailAccounts,
  useMailCache,
  useMailClient,
  useMailForwarding,
  useMailInbox,
  useMailMessage,
  useMailMessages,
} from "@/hooks/useMail";
import { MAIL_SEARCH_DEBOUNCE_MS } from "@/config/timing";
import { callbackNoticeFor } from "@/lib/mail/notices";
import { useMailActions } from "@/hooks/useMailActions";

type View = "accounts" | "forwarded";

function emptyDetailHint(accountCount: number, openId: string | null): string {
  if (accountCount === 0) return "Podłącz konto Gmail lub Outlook.";
  if (openId) return "Wczytywanie wiadomości…";
  return "Wybierz wiadomość z listy.";
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export default function MailPage() {
  const router = useRouter();
  const { toast } = useToast();
  const client = useMailClient();
  const cache = useMailCache();
  const isSmallScreen = useResponsive();

  const [view, setView] = useState<View>("accounts");
  const [chosenAccountId, setChosenAccountId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [open, setOpen] = useState<{ accountId: string; id: string } | null>(null);
  const [inboxQuery, setInboxQuery] = useState("");

  const accountsQuery = useMailAccounts();
  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);
  // Wybrane konto wynika z listy kont – bez efektu, który przełączałby konto po zmianie frazy.
  const account = accounts.find((a) => a.id === chosenAccountId) ?? accounts[0] ?? null;
  const accountId = account?.id ?? null;

  const messagesQuery = useMailMessages(accountId, searchedQuery);
  const messages = messagesQuery.data ?? [];
  const openId = open && open.accountId === accountId ? open.id : null;
  const messageQuery = useMailMessage(accountId, openId);
  const detail = messageQuery.data ?? null;

  const forwardingQuery = useMailForwarding(view === "forwarded");
  const inboxQueryResult = useMailInbox(view === "forwarded");
  const inbox = useMemo(() => inboxQueryResult.data ?? [], [inboxQueryResult.data]);

  // Wyszukiwanie u dostawcy z opóźnieniem – bez zapytania przy każdym znaku.
  useEffect(() => {
    if (query === searchedQuery) return;
    const timer = setTimeout(() => setSearchedQuery(query), MAIL_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, searchedQuery]);

  // Błędy zapytań: jeden komunikat na błąd.
  const queryError =
    accountsQuery.error ?? messagesQuery.error ?? messageQuery.error ?? forwardingQuery.error ?? inboxQueryResult.error;
  useEffect(() => {
    if (queryError) toast.error(errorText(queryError, "Nie udało się pobrać danych poczty."), { cause: queryError });
  }, [queryError, toast]);

  // Wynik powrotu z Google/Microsoft: jeden komunikat, potem parametry znikają z adresu.
  useEffect(() => {
    if (!router.isReady) return;
    const { connected, error } = router.query;
    if (typeof connected === "string") toast.success(callbackNoticeFor(connected));
    else if (typeof error === "string") toast.error(callbackNoticeFor(error));
    else return;
    void router.replace("/mail", undefined, { shallow: true });
  }, [router, toast]);

  const filteredInbox = useMemo(() => {
    const q = inboxQuery.trim().toLowerCase();
    if (!q) return inbox;
    return inbox.filter((i) => `${i.from}\n${i.subject}\n${i.text}`.toLowerCase().includes(q));
  }, [inbox, inboxQuery]);

  const { busy, connect, disconnect, deleteMessage, createForwarding, revokeForwarding, inboxAction, deleteInbox } =
    useMailActions({ client, cache, toast, accounts, account, inbox, open, openId, setOpen });

  const selectAccount = (id: string) => {
    setChosenAccountId(id);
    setOpen(null);
  };

  const renderForwarded = () => (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <ForwardingPanel
        addresses={forwardingQuery.data ?? []}
        onCreate={createForwarding}
        onRevoke={(id) => void revokeForwarding(id)}
        busy={busy}
      />
      <SearchBar
        value={inboxQuery}
        onChange={setInboxQuery}
        placeholder="Szukaj w przekierowanych…"
        resultsCount={inboxQuery.trim() ? filteredInbox.length : undefined}
        resultsLabel="wiadomości"
      />
      <InboxList
        items={filteredInbox}
        searching={inboxQuery.trim().length > 0}
        onTask={(id) => void inboxAction(id, "task")}
        onEvent={(id) => void inboxAction(id, "event")}
        onDelete={(id) => void deleteInbox(id)}
        busy={busy}
      />
    </div>
  );

  const renderAccounts = () => (
    <div className="grid w-full min-w-0 gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      {!(isSmallScreen && openId) && (
        <div className="min-w-0 space-y-4">
          <MailAccountsPanel
            accounts={accounts}
            selectedId={accountId}
            onSelect={selectAccount}
            onConnectGmail={() => void connect(() => client.startGmailConnection())}
            onConnectOutlook={() => void connect(() => client.startOutlookConnection())}
            onDisconnect={(id) => void disconnect(id)}
            busy={busy}
          />
          {accountId && (
            <>
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder="Szukaj w poczcie…"
                resultsCount={searchedQuery.trim() && !messagesQuery.isFetching ? messages.length : undefined}
                resultsLabel="wiadomości"
              />
              <MessageList
                messages={messages}
                selectedId={openId}
                onSelect={(id) => setOpen({ accountId, id })}
                onDelete={(m) => void deleteMessage(m)}
                loading={messagesQuery.isLoading}
                searching={searchedQuery.trim().length > 0}
              />
            </>
          )}
        </div>
      )}
      {(!isSmallScreen || openId) && (
        <div className="min-w-0">
          {detail && accountId ? (
            <MessageDetail
              client={client}
              accountId={accountId}
              message={detail.message}
              invitation={detail.invitation}
              onBack={isSmallScreen ? () => setOpen(null) : undefined}
              onDelete={() => void deleteMessage(detail.message)}
            />
          ) : (
            <NoResultsState
              text={accounts.length === 0 ? "kont pocztowych" : "otwartej wiadomości"}
              hint={emptyDetailHint(accounts.length, openId)}
            />
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Seo title="Poczta" description="Poczta Gmail i Outlook oraz przekierowania w aplikacji." noindex={true} />
      <div className="space-y-6 pb-20">
        <div className="flex w-full flex-wrap items-center justify-between gap-4">
          <h1 className="page-title">Poczta</h1>
          <fieldset className="flex gap-2 border-0 p-0">
            <legend className="sr-only">Widok poczty</legend>
            <ToggleChip label="Konta" active={view === "accounts"} onClick={() => setView("accounts")} />
            <ToggleChip label="Przekierowania" active={view === "forwarded"} onClick={() => setView("forwarded")} />
          </fieldset>
        </div>

        {view === "forwarded" ? renderForwarded() : renderAccounts()}
      </div>
    </>
  );
}
