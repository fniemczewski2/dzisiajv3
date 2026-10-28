// lib/mail/deleteFlow.ts
//
// Dwustopniowe potwierdzenie usunięcia wiadomości:
//   1) „Usunąć z aplikacji?” – Anuluj kończy bez zmian,
//   2) „Przenieść też do kosza w poczcie?” – tylko jawne kliknięcie usuwa w skrzynce;
//      odmowa lub zamknięcie oznacza usunięcie wyłącznie z aplikacji.
// Krok 2 jest pomijany, gdy zgoda konta nie obejmuje usuwania w skrzynce.

import type { ConfirmOptions } from "@/types/toasts";

export type DeleteMode = "cancel" | "app" | "mailbox";

type Confirm = (message: string, options?: ConfirmOptions) => Promise<boolean>;

const PROVIDER_LABEL = { gmail: "Gmailu", outlook: "Outlooku" } as const;

export async function askDeleteMode(
  confirm: Confirm,
  params: { subject: string; provider: "gmail" | "outlook"; canDeleteInMailbox: boolean }
): Promise<DeleteMode> {
  const subject = params.subject.trim() || "bez tematu";
  const fromApp = await confirm(`Usunąć wiadomość „${subject}” z aplikacji?`, {
    confirmLabel: "Usuń",
    cancelLabel: "Anuluj",
  });
  if (!fromApp) return "cancel";
  if (!params.canDeleteInMailbox) return "app";

  const inMailbox = await confirm(
    `Przenieść ją także do kosza w ${PROVIDER_LABEL[params.provider]}? Można ją stamtąd przywrócić.`,
    { confirmLabel: "Także w poczcie", cancelLabel: "Tylko z aplikacji" }
  );
  return inMailbox ? "mailbox" : "app";
}
