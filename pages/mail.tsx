// pages/mail.tsx
//
// Poczta: konta Gmail/Outlook (odczyt, odpowiedź po potwierdzeniu, zadanie, wydarzenie) oraz przekierowania.
// Treść wiadomości z kont nie jest zapisywana; komunikaty przez useToast, jak w pozostałych modułach.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Seo from "@/components/ui/SEO";
import { useToast } from "@/providers/ToastProvider";
import MailAccountsPanel from "@/components/mail/MailAccountsPanel";
import MessageList from "@/components/mail/MessageList";
import MessageDetail from "@/components/mail/MessageDetail";
import ForwardingPanel from "@/components/mail/ForwardingPanel";
import InboxList from "@/components/mail/InboxList";
import NoResultsState from "@/components/ui/NoResultsState";
import SearchBar from "@/components/ui/SearchBar";
import { useResponsive } from "@/hooks/useResponsive";
import { callbackNoticeFor } from "@/lib/mail/notices";
import { askDeleteMode } from "@/lib/mail/deleteFlow";
import {
  createMailClient,
  type ForwardingAddress,
  type InboxItem,
  type MailAccount,
  type MailMessageFull,
  type MailMessageSummary,
} from "@/lib/mail/client";
import type { Invitation } from "@/lib/mail/invitations";

type View = "accounts" | "forwarded";

export default function MailPage() {
  const router = useRouter();
  const { toast } = useToast();
  const client = useMemo(() => createMailClient(), []);

  const [view, setView] = useState<View>("accounts");
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MailMessageSummary[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [detail, setDetail] = useState<{ message: MailMessageFull; invitation: Invitation | null } | null>(null);
  const [forwarding, setForwarding] = useState<ForwardingAddress[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  /** Fraza, dla której pobrano bieżącą listę (wyszukiwanie z opóźnieniem). */
  const [searchedQuery, setSearchedQuery] = useState("");
  const [inboxQuery, setInboxQuery] = useState("");
  const isSmallScreen = useResponsive();

  const fail = useCallback(
    (fallback: string, err: unknown) =>
      toast.error(err instanceof Error && err.message ? err.message : fallback, { cause: err }),
    [toast]
  );

  const loadMessages = useCallback(
    async (id: string, search = "") => {
      setLoadingList(true);
      setDetail(null);
      try {
        setMessages(await client.listMessages(id, search));
      } catch (err) {
        setMessages([]);
        fail("Nie udało się pobrać wiadomości.", err);
      } finally {
        setLoadingList(false);
      }
    },
    [client, fail]
  );

  const selectAccount = useCallback(
    (id: string | null) => {
      setAccountId(id);
      if (id) void loadMessages(id, searchedQuery);
      else {
        setMessages([]);
        setDetail(null);
      }
    },
    [loadMessages, searchedQuery]
  );

  useEffect(() => {
    let active = true;
    client
      .listAccounts()
      .then((list) => {
        if (!active) return;
        setAccounts(list);
        selectAccount(list[0]?.id ?? null);
      })
      .catch((err: unknown) => fail("Nie udało się pobrać kont pocztowych.", err));
    return () => {
      active = false;
    };
  }, [client, fail, selectAccount]);

  // Wyszukiwanie po stronie dostawcy z opóźnieniem – bez zapytania przy każdym znaku.
  useEffect(() => {
    if (!accountId || query === searchedQuery) return;
    const timer = setTimeout(() => {
      setSearchedQuery(query);
      void loadMessages(accountId, query);
    }, 400);
    return () => clearTimeout(timer);
  }, [accountId, query, searchedQuery, loadMessages]);

  const filteredInbox = useMemo(() => {
    const q = inboxQuery.trim().toLowerCase();
    if (!q) return inbox;
    return inbox.filter((i) => `${i.from}\n${i.subject}\n${i.text}`.toLowerCase().includes(q));
  }, [inbox, inboxQuery]);

  // Wynik powrotu z Google/Microsoft: jeden komunikat, potem parametry znikają z adresu.
  useEffect(() => {
    if (!router.isReady) return;
    const { connected, error } = router.query;
    if (typeof connected === "string") toast.success(callbackNoticeFor(connected));
    else if (typeof error === "string") toast.error(callbackNoticeFor(error));
    else return;
    void router.replace("/mail", undefined, { shallow: true });
  }, [router, toast]);

  const openMessage = async (id: string) => {
    if (!accountId) return;
    try {
      setDetail(await client.getMessage(accountId, id));
    } catch (err) {
      fail("Nie udało się otworzyć wiadomości.", err);
    }
  };

  const connect = (start: () => Promise<string>) => async () => {
    setBusy(true);
    try {
      window.location.assign(await start());
    } catch (err) {
      fail("Nie udało się rozpocząć łączenia konta.", err);
      setBusy(false);
    }
  };

  const disconnect = async (id: string) => {
    const account = accounts.find((a) => a.id === id);
    if (!(await toast.confirm(`Odłączyć konto ${account?.email ?? ""}?`))) return;
    setBusy(true);
    try {
      await client.disconnect(id);
      const remaining = accounts.filter((a) => a.id !== id);
      setAccounts(remaining);
      if (accountId === id) selectAccount(remaining[0]?.id ?? null);
      toast.success("Konto odłączono.");
    } catch (err) {
      fail("Nie udało się odłączyć konta.", err);
    } finally {
      setBusy(false);
    }
  };

  const deleteMessage = async (message: { id: string; subject: string }) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;
    const mode = await askDeleteMode(toast.confirm, {
      subject: message.subject,
      provider: account.provider,
      canDeleteInMailbox: account.canDeleteInMailbox,
    });
    if (mode === "cancel") return;
    setBusy(true);
    try {
      await client.deleteMessage({ accountId: account.id, messageId: message.id, mailbox: mode === "mailbox" });
      setMessages((list) => list.filter((m) => m.id !== message.id));
      if (detail?.message.id === message.id) setDetail(null);
      toast.success(
        mode === "mailbox"
          ? `Usunięto z aplikacji i przeniesiono do kosza w ${account.provider === "gmail" ? "Gmailu" : "Outlooku"}.`
          : "Usunięto z aplikacji. W poczcie wiadomość pozostała."
      );
      if (mode === "app" && !account.canDeleteInMailbox) {
        toast.info("Aby usuwać wiadomości także w poczcie, odłącz i połącz konto ponownie (nowe uprawnienia).");
      }
    } catch (err) {
      fail("Nie udało się usunąć wiadomości.", err);
    } finally {
      setBusy(false);
    }
  };

  const loadForwarded = useCallback(async () => {
    try {
      const [addresses, items] = await Promise.all([client.listForwarding(), client.listInbox()]);
      setForwarding(addresses);
      setInbox(items);
    } catch (err) {
      fail("Nie udało się pobrać przekierowań.", err);
    }
  }, [client, fail]);

  const switchView = (next: View) => {
    setView(next);
    if (next === "forwarded") void loadForwarded();
  };

  const withBusy = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const createForwarding = async (label: string): Promise<string | null> => {
    setBusy(true);
    try {
      const created = await client.createForwarding(label);
      await loadForwarded();
      return created.address;
    } catch (err) {
      fail("Nie udało się utworzyć adresu przekierowania.", err);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const revokeForwarding = (id: string) =>
    withBusy(async () => {
      if (!(await toast.confirm("Odwołać adres? Wiadomości wysłane na niego przestaną docierać."))) return;
      try {
        await client.revokeForwarding(id);
        await loadForwarded();
        toast.success("Adres odwołano.");
      } catch (err) {
        fail("Nie udało się odwołać adresu.", err);
      }
    });

  const inboxAction = (id: string, action: "task" | "event") =>
    withBusy(async () => {
      try {
        await client.inboxAction(id, action);
        toast.success(action === "task" ? "Dodano zadanie." : "Dodano wydarzenie do kalendarza.");
      } catch (err) {
        fail(action === "task" ? "Nie udało się dodać zadania." : "Nie udało się dodać wydarzenia.", err);
      }
    });

  const deleteInbox = (id: string) =>
    withBusy(async () => {
      const item = inbox.find((i) => i.id === id);
      const ok = await toast.confirm(
        `Usunąć wiadomość „${item?.subject.trim() || "bez tematu"}” z aplikacji? W Twojej skrzynce pocztowej pozostanie bez zmian.`,
        { confirmLabel: "Usuń", cancelLabel: "Anuluj" }
      );
      if (!ok) return;
      try {
        await client.deleteInbox(id);
        setInbox((items) => items.filter((i) => i.id !== id));
        toast.success("Usunięto z aplikacji.");
      } catch (err) {
        fail("Nie udało się usunąć wiadomości.", err);
      }
    });

  return (
    <>
      <Seo title="Poczta" description="Poczta Gmail i Outlook oraz przekierowania w aplikacji." noindex={true} />
      <div className="space-y-6 pb-20">
        <div className="flex w-full flex-wrap items-center justify-between gap-4">
          <h1 className="page-title">Poczta</h1>
          <fieldset aria-label="Widok poczty" className="flex gap-2 border-0 p-0">
            {(["accounts", "forwarded"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => switchView(v)}
                className={`min-h-11 rounded-lg border px-4 text-sm ${
                  view === v ? "border-primary font-semibold text-text" : "border-line text-text-secondary"
                }`}
              >
                {v === "accounts" ? "Konta" : "Przekierowania"}
              </button>
            ))}
          </fieldset>
        </div>

        {view === "forwarded" ? (
          <div className="mx-auto w-full max-w-3xl space-y-8">
            <ForwardingPanel
              addresses={forwarding}
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
        ) : (
          <div className="grid w-full min-w-0 gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            {!(isSmallScreen && detail) && (
              <div className="min-w-0 space-y-4">
                <MailAccountsPanel
                  accounts={accounts}
                  selectedId={accountId}
                  onSelect={(id) => selectAccount(id)}
                  onConnectGmail={() => void connect(() => client.startGmailConnection())()}
                  onConnectOutlook={() => void connect(() => client.startOutlookConnection())()}
                  onDisconnect={(id) => void disconnect(id)}
                  busy={busy}
                />
                {accountId && (
                  <>
                    <SearchBar
                      value={query}
                      onChange={setQuery}
                      placeholder="Szukaj w poczcie…"
                      resultsCount={searchedQuery.trim() && !loadingList ? messages.length : undefined}
                      resultsLabel="wiadomości"
                    />
                    <MessageList
                      messages={messages}
                      selectedId={detail?.message.id ?? null}
                      onSelect={(id) => void openMessage(id)}
                      onDelete={(m) => void deleteMessage(m)}
                      loading={loadingList}
                      searching={searchedQuery.trim().length > 0}
                    />
                  </>
                )}
              </div>
            )}
            {(!isSmallScreen || detail) && (
              <div className="min-w-0">
                {detail && accountId ? (
                  <MessageDetail
                    client={client}
                    accountId={accountId}
                    message={detail.message}
                    invitation={detail.invitation}
                    onBack={isSmallScreen ? () => setDetail(null) : undefined}
                    onDelete={() => void deleteMessage(detail.message)}
                  />
                ) : (
                  <NoResultsState
                    text={accounts.length === 0 ? "kont pocztowych" : "otwartej wiadomości"}
                    hint={accounts.length === 0 ? "Podłącz konto Gmail lub Outlook." : "Wybierz wiadomość z listy."}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
