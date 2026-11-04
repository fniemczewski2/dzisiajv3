// hooks/useMailActions.ts
//
// Akcje strony /mail (łączenie, odłączanie, usuwanie, przekierowania) – poza komponentem strony.

import { useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { MAIL_KEYS } from "@/hooks/useMail";
import { askDeleteMode } from "@/lib/mail/deleteFlow";
import type { InboxItem, MailAccount, MailClient, MailMessageSummary } from "@/lib/mail/client";
import type { useToast } from "@/providers/ToastProvider";

type Toast = ReturnType<typeof useToast>["toast"];

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function useMailActions(deps: {
  client: MailClient;
  cache: QueryClient;
  toast: Toast;
  accounts: MailAccount[];
  account: MailAccount | null;
  inbox: InboxItem[];
  open: { accountId: string; id: string } | null;
  setOpen: (value: { accountId: string; id: string } | null) => void;
}) {
  const { client, cache, toast, accounts, account: selected, inbox, open, setOpen } = deps;
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>, failure: string) => {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      toast.error(errorText(err, failure), { cause: err });
    } finally {
      setBusy(false);
    }
  };

  const connect = (start: () => Promise<string>) =>
    run(async () => {
      window.location.assign(await start());
    }, "Nie udało się rozpocząć łączenia konta.");

  const disconnect = async (id: string) => {
    const target = accounts.find((a) => a.id === id);
    if (!(await toast.confirm(`Odłączyć konto ${target?.email ?? ""}?`))) return;
    await run(async () => {
      await client.disconnect(id);
      await cache.invalidateQueries({ queryKey: MAIL_KEYS.accounts });
      cache.removeQueries({ queryKey: MAIL_KEYS.messagesOf(id) });
      if (open?.accountId === id) setOpen(null);
      toast.success("Konto odłączono.");
    }, "Nie udało się odłączyć konta.");
  };

  /** Usuwa wiadomość z konta wskazanego jawnie (widok wspólny) albo z wybranego konta. */
  const deleteMessage = async (message: Pick<MailMessageSummary, "id" | "subject">, target?: MailAccount) => {
    const account = target ?? selected;
    if (!account) return;
    const mode = await askDeleteMode(toast.confirm, {
      subject: message.subject,
      provider: account.provider,
      canDeleteInMailbox: account.canDeleteInMailbox,
    });
    if (mode === "cancel") return;
    await run(async () => {
      await client.deleteMessage({ accountId: account.id, messageId: message.id, mailbox: mode === "mailbox" });
      cache.setQueriesData<MailMessageSummary[]>({ queryKey: MAIL_KEYS.messagesOf(account.id) }, (list) =>
        list?.filter((m) => m.id !== message.id)
      );
      cache.removeQueries({ queryKey: MAIL_KEYS.message(account.id, message.id) });
      if (open?.accountId === account.id && open.id === message.id) setOpen(null);
      const providerName = account.provider === "gmail" ? "Gmailu" : "Outlooku";
      toast.success(
        mode === "mailbox"
          ? `Usunięto z aplikacji i przeniesiono do kosza w ${providerName}.`
          : "Usunięto z aplikacji. W poczcie wiadomość pozostała."
      );
      if (mode === "app" && !account.canDeleteInMailbox) {
        toast.info("Aby usuwać wiadomości także w poczcie, odłącz i połącz konto ponownie (nowe uprawnienia).");
      }
    }, "Nie udało się usunąć wiadomości.");
  };

  const createForwarding = async (label: string): Promise<string | null> => {
    let address: string | null = null;
    await run(async () => {
      address = (await client.createForwarding(label)).address;
      await cache.invalidateQueries({ queryKey: MAIL_KEYS.forwarding });
    }, "Nie udało się utworzyć adresu przekierowania.");
    return address;
  };

  const revokeForwarding = async (id: string) => {
    if (!(await toast.confirm("Odwołać adres? Wiadomości wysłane na niego przestaną docierać."))) return;
    await run(async () => {
      await client.revokeForwarding(id);
      await cache.invalidateQueries({ queryKey: MAIL_KEYS.forwarding });
      toast.success("Adres odwołano.");
    }, "Nie udało się odwołać adresu.");
  };

  const inboxAction = (id: string, action: "task" | "event") =>
    run(
      async () => {
        await client.inboxAction(id, action);
        toast.success(action === "task" ? "Dodano zadanie." : "Dodano wydarzenie do kalendarza.");
      },
      action === "task" ? "Nie udało się dodać zadania." : "Nie udało się dodać wydarzenia."
    );

  const deleteInbox = async (id: string) => {
    const item = inbox.find((i) => i.id === id);
    const ok = await toast.confirm(
      `Usunąć wiadomość „${item?.subject.trim() || "bez tematu"}” z aplikacji? W Twojej skrzynce pocztowej pozostanie bez zmian.`,
      { confirmLabel: "Usuń", cancelLabel: "Anuluj" }
    );
    if (!ok) return;
    await run(async () => {
      await client.deleteInbox(id);
      cache.setQueryData<InboxItem[]>(MAIL_KEYS.inbox, (list) => list?.filter((i) => i.id !== id));
      toast.success("Usunięto z aplikacji.");
    }, "Nie udało się usunąć wiadomości.");
  };

  return { busy, connect, disconnect, deleteMessage, createForwarding, revokeForwarding, inboxAction, deleteInbox };
}
