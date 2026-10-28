// lib/mail/inboxActions.ts
//
// Zamiana przekierowanej wiadomości (z bufora) na wiersz zadania lub wydarzenia. Czysta logika.

import { parseInboundPayload, invitationOf } from "@/lib/mail/inbound";
import { buildMailTaskRow, type MailTaskRow } from "@/lib/mail/mailTasks";
import { buildMailEventRow, type MailEventRow } from "@/lib/server/mailEvents";

export type InboxAction = "task" | "event";

export function inboxActionRow(
  payload: unknown,
  action: InboxAction,
  userId: string,
  today: string
): { kind: "task"; row: MailTaskRow } | { kind: "event"; row: MailEventRow } | { error: string } {
  const message = parseInboundPayload(payload);
  if (!message) return { error: "Nie udało się odczytać wiadomości." };

  if (action === "task") {
    return {
      kind: "task",
      row: buildMailTaskRow({ subject: message.subject, from: message.from, userId, today }),
    };
  }

  const invitation = invitationOf(message);
  if (!invitation) return { error: "W tej wiadomości nie wykryto zaproszenia." };
  const built = buildMailEventRow(invitation, userId);
  if ("error" in built) return { error: built.error };
  return { kind: "event", row: built.row };
}
