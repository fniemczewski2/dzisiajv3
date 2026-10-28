// pages/api/mail/delete.ts
//
// Usunięcie wiadomości z aplikacji (zapis identyfikatora w mail_hidden_messages) oraz – tylko gdy
// użytkownik wybrał to w potwierdzeniu (mailbox: true) – przeniesienie do kosza w skrzynce (odwracalne).
// Kolejność: najpierw kosz w skrzynce; jeśli się nie uda, w aplikacji nic się nie zmienia.

import type { NextApiRequest, NextApiResponse } from "next";
import { CACHE_CONTROL } from "@/config/server";
import { allowMethods } from "@/lib/server/apiGuards";
import { enforceRateLimit } from "@/lib/server/rateLimit";
import { isValidMessageId, loadMailContext } from "@/lib/server/mailRoute";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (!allowMethods(req, res, ["POST"])) return;
  res.setHeader("Cache-Control", CACHE_CONTROL.private);

  const { accountId, messageId, mailbox } = (req.body ?? {}) as {
    accountId?: unknown;
    messageId?: unknown;
    mailbox?: unknown;
  };
  if (!isValidMessageId(messageId)) {
    res.status(400).json({ error: "Nieprawidłowy identyfikator wiadomości." });
    return;
  }
  if (mailbox !== undefined && typeof mailbox !== "boolean") {
    res.status(400).json({ error: "Nieprawidłowy parametr mailbox." });
    return;
  }

  const ctx = await loadMailContext(req, res, accountId);
  if (!ctx) return;
  if (!(await enforceRateLimit(res, "mailDelete", ctx.userId))) return;

  if (mailbox === true) {
    if (!ctx.canDeleteInMailbox) {
      res.status(409).json({ error: "Połącz konto ponownie, aby usuwać wiadomości także w poczcie." });
      return;
    }
    try {
      await ctx.client.trash(messageId);
    } catch (err) {
      console.error("[mail/delete] przeniesienie do kosza:", err);
      res.status(502).json({ error: "Nie udało się usunąć wiadomości w poczcie." });
      return;
    }
  }

  const { error } = await ctx.supabase
    .from("mail_hidden_messages")
    .upsert(
      { user_id: ctx.userId, account_id: ctx.accountId, message_id: messageId },
      { onConflict: "account_id,message_id", ignoreDuplicates: true }
    );
  if (error) {
    console.error("[mail/delete] zapis ukrycia:", error.message);
    res.status(500).json({
      error:
        mailbox === true
          ? "Przeniesiono do kosza, ale nie udało się zapisać zmiany w aplikacji."
          : "Nie udało się usunąć wiadomości.",
    });
    return;
  }
  res.status(200).json({ hidden: true, trashed: mailbox === true });
}
