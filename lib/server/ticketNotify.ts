// lib/server/ticketNotify.ts
//
// Potwierdzenie importu biletu: po każdej wiadomości na adres biletów (b-…) aplikacja wysyła
// jedną wiadomość na adres podłączonego konta poczty – lista dodanych odcinków albo opis błędu.
// Wysyłka idzie przez konto użytkownika (Gmail gmail.send / Outlook Mail.Send); brak konta
// z uprawnieniem do wysyłki oznacza po prostu brak potwierdzenia (import i tak się wykonał).

import type { SupabaseClient } from "@supabase/supabase-js";
import { createGmailClient } from "@/lib/mail/gmail";
import { createOutlookClient } from "@/lib/mail/outlook";
import { gmailProvider, outlookProvider, type MailProviderClient } from "@/lib/mail/provider";
import { resolveAccessToken, type StoredMailTokens } from "@/lib/mail/accessToken";
import { decryptToken, encryptToken } from "@/lib/server/tokenCrypto";
import { refreshGoogleToken, refreshOutlookToken } from "@/lib/server/oauthTokens";
import { describeRow, type TicketImportResult } from "@/lib/server/ticketInbound";

export type TicketNotice = { ok: true; result: TicketImportResult } | { ok: false; reason: string };

interface SendingAccount extends StoredMailTokens {
  id: string;
  email: string;
  provider: "gmail" | "outlook";
  scope: string | null;
}

/** Uprawnienie do wysyłki w zapisanych zakresach OAuth konta. */
function canSend(account: Pick<SendingAccount, "provider" | "scope">): boolean {
  const scope = (account.scope ?? "").toLowerCase();
  return account.provider === "gmail" ? scope.includes("gmail.send") : scope.includes("mail.send");
}

export function ticketNoticeSubject(notice: TicketNotice): string {
  if (!notice.ok) return "Bilet: nie udało się dodać";
  const { added, duplicates, unreadable } = notice.result;
  if (added > 0) return `Bilet: dodano ${added} ${added === 1 ? "odcinek" : "odcinki/odcinków"}`;
  if (duplicates > 0) return "Bilet: już był w aplikacji";
  if (unreadable > 0) return "Bilet: nie rozpoznano załącznika";
  return "Bilet: brak danych do dodania";
}

export function ticketNoticeBody(notice: TicketNotice, subject: string): string {
  const header = `Wiadomość: ${subject || "(bez tematu)"}`;
  if (!notice.ok) {
    return [header, "", `Błąd zapisu biletu: ${notice.reason}`, "Bilet nie został dodany – prześlij go ponownie."].join(
      "\n"
    );
  }
  const { added, duplicates, unreadable, addedRows } = notice.result;
  const lines = [header, ""];
  if (added > 0) {
    lines.push("Dodano do „Pociągów” (do sprawdzenia):");
    for (const row of addedRows) lines.push(`- ${describeRow(row)}`);
  }
  if (duplicates > 0) lines.push(`Pominięto jako już zapisane: ${duplicates}.`);
  if (unreadable > 0) lines.push(`Załączniki PDF bez rozpoznanego biletu PKP Intercity: ${unreadable}.`);
  if (added === 0 && duplicates === 0 && unreadable === 0) lines.push("W wiadomości nie było załącznika PDF.");
  return lines.join("\n");
}

/** Konto z uprawnieniem do wysyłki i ważny klient dostawcy; null – brak takiego konta. */
async function sendingClient(
  admin: SupabaseClient,
  userId: string
): Promise<{ client: MailProviderClient; email: string } | null> {
  const { data } = await admin
    .from("mail_accounts")
    .select("id, email, provider, scope, access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const account = ((data ?? []) as SendingAccount[]).find(canSend);
  if (!account) return null;

  const refresh =
    account.provider === "outlook"
      ? async (refreshToken: string) => {
          const fresh = await refreshOutlookToken(refreshToken);
          if (fresh?.refresh_token) {
            await admin
              .from("mail_accounts")
              .update({ refresh_token: encryptToken(fresh.refresh_token) })
              .eq("id", account.id);
          }
          return fresh?.access_token ?? null;
        }
      : refreshGoogleToken;

  const accessToken = await resolveAccessToken(account, {
    decrypt: decryptToken,
    encrypt: encryptToken,
    refresh,
    persist: async (encryptedAccessToken, expiresAt) => {
      await admin
        .from("mail_accounts")
        .update({ access_token: encryptedAccessToken, expires_at: expiresAt, updated_at: new Date().toISOString() })
        .eq("id", account.id);
    },
  });
  if (!accessToken) return null;

  const client =
    account.provider === "outlook"
      ? outlookProvider(createOutlookClient(accessToken))
      : gmailProvider(createGmailClient(accessToken), account.email);
  return { client, email: account.email };
}

/** Wysyłka potwierdzenia. Nie rzuca wyjątków – błąd wysyłki nie może cofnąć zapisanego biletu. */
export async function notifyTicketImport(
  admin: SupabaseClient,
  userId: string,
  messageSubject: string,
  notice: TicketNotice
): Promise<boolean> {
  try {
    const sender = await sendingClient(admin, userId);
    if (!sender) return false;
    await sender.client.send({
      to: sender.email,
      subject: ticketNoticeSubject(notice),
      body: ticketNoticeBody(notice, messageSubject),
    });
    return true;
  } catch (err) {
    console.error("[mail/inbound] potwierdzenie biletu:", err instanceof Error ? err.message : "nieznany błąd");
    return false;
  }
}
