// lib/server/mailAttachments.ts
//
// Dołącza treść załączników kalendarza (.ics) do wiadomości – potrzebne do wykrycia zaproszenia.

import type { MailMessage } from "@/lib/mail/types";
import type { MailProviderClient } from "@/lib/mail/provider";
import { detectInvitation, type Invitation } from "@/lib/mail/invitations";

function isCalendarAttachment(a: { mimeType: string; filename: string }): boolean {
  return a.mimeType === "text/calendar" || a.filename.toLowerCase().endsWith(".ics");
}

export async function invitationFor(client: MailProviderClient, message: MailMessage): Promise<Invitation | null> {
  const attachments = await Promise.all(
    message.attachments.map(async (a) =>
      isCalendarAttachment(a) ? { ...a, icsText: await client.getAttachmentText(message.id, a.attachmentId) } : a
    )
  );
  return detectInvitation({ subject: message.subject, text: message.text, attachments });
}
