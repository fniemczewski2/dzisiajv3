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
import UnifiedMailList from "@/components/mail/UnifiedMailList";
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
  useMailMessagesOfAccounts,
} from "@/hooks/useMail";
import { MAIL_SEARCH_DEBOUNCE_MS } from "@/config/timing";
import { callbackNoticeFor } from "@/lib/mail/notices";
import { filterInbox, mergeMail } from "@/lib/mail/unified";
import { useMailActions } from "@/hooks/useMailActions";

type View = "all" | "accounts" | "forwarded";

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

  const [chosenView, setChosenView] = useState<View>("all");
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

  // Bez żadnego konta widok wspólny jest pusty – pokazujemy panel kont (połączenie pierwszego konta).
  const view: View = chosenView === "all" && accounts.length === 0 ? "accounts" : chosenView;

  const messagesQuery = useMailMessages(view === "accounts" ? accountId : null, searchedQuery);
  const messages = messagesQuery.data ?? [];
  // Wiadomość otwarta w widoku wspólnym może pochodzić z dowolnego konta, w widoku konta – z wybranego.
  const detailAccountId = view === "all" ? (open?.accountId ?? null) : accountId;
  const openId = open && open.accountId === detailAccountId ? open.id : null;
  const messageQuery = useMailMessage(detailAccountId, openId);
  const detail = messageQuery.data ?? null;

  const allMessages = useMailMessagesOfAccounts(accounts, searchedQuery, view === "all");
  const forwardingQuery = useMailForwarding(view === "forwarded");
  const inboxQueryResult = useMailInbox(view === "forwarded" || view === "all");
  const inbox = useMemo(() => inboxQueryResult.data ?? [], [inboxQueryResult.data]);

  // Wyszukiwanie u dostawcy z opóźnieniem – bez zapytania przy każdym znaku.
  useEffect(() => {
    if (query === searchedQuery) return;
    const timer = setTimeout(() => setSearchedQuery(query), MAIL_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, searchedQuery]);

  // Błędy zapytań: jeden komunikat na błąd.
  const queryError =
    accountsQuery.error ??
    messagesQuery.error ??
    allMessages.error ??
    messageQuery.error ??
    forwardingQuery.error ??
    inboxQueryResult.error;
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

  const unified = useMemo(
    () => mergeMail(accounts, allMessages.data, filterInbox(inbox, searchedQuery)),
    [accounts, allMessages.data, inbox, searchedQuery]
  );

  const { busy, connect, disconnect, deleteMessage, createForwarding, revokeForwarding, inboxAction, deleteInbox } =
    useMailActions({ client, cache, toast, accounts, account, inbox, open, setOpen });

  const selectAccount = (id: string) => {
    setChosenAccountId(id);
    setOpen(null);
  };

  const renderAll = () => (
    <div className="grid w-full min-w-0 gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      {!(isSmallScreen && openId) && (
        <div className="min-w-0 space-y-4">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Szukaj we wszystkich skrzynkach…"
            resultsCount={searchedQuery.trim() && !allMessages.isFetching ? unified.length : undefined}
            resultsLabel="wiadomości"
          />
          <UnifiedMailList
            items={unified}
            loading={accountsQuery.isLoading || allMessages.isLoading || inboxQueryResult.isLoading}
            searching={searchedQuery.trim().length > 0}
            selected={open}
            onSelect={(id, messageId) => setOpen({ accountId: id, id: messageId })}
            onDeleteMessage={(id, message) =>
              void deleteMessage(
                message,
                accounts.find((a) => a.id === id)
              )
            }
            onTask={(id) => void inboxAction(id, "task")}
            onEvent={(id) => void inboxAction(id, "event")}
            onDeleteInbox={(id) => void deleteInbox(id)}
            busy={busy}
          />
        </div>
      )}
      {(!isSmallScreen || openId) && (
        <div className="min-w-0">
          {detail && detailAccountId ? (
            <MessageDetail
              client={client}
              accountId={detailAccountId}
              message={detail.message}
              invitation={detail.invitation}
              onBack={isSmallScreen ? () => setOpen(null) : undefined}
              onDelete={() =>
                void deleteMessage(
                  detail.message,
                  accounts.find((a) => a.id === detailAccountId)
                )
              }
            />
          ) : (
            <NoResultsState text="otwartej wiadomości" hint="Wybierz wiadomość z listy, aby ją przeczytać." />
          )}
        </div>
      )}
    </div>
  );

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
            <ToggleChip label="Wszystkie" active={view === "all"} onClick={() => setChosenView("all")} />
            <ToggleChip label="Konta" active={view === "accounts"} onClick={() => setChosenView("accounts")} />
            <ToggleChip
              label="Przekierowania"
              active={view === "forwarded"}
              onClick={() => setChosenView("forwarded")}
            />
          </fieldset>
        </div>

        {view === "all" && renderAll()}
        {view === "accounts" && renderAccounts()}
        {view === "forwarded" && renderForwarded()}
      </div>
    </>
  );
}
