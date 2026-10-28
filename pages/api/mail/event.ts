// pages/api/mail/event.ts
//
// Dodaje wydarzenie z zaproszenia (załącznik .ics lub wiadomość z linkiem) do kalendarza użytkownika.

import type { NextApiRequest, NextApiResponse } from "next";
import { CACHE_CONTROL } from "@/config/server";
import { allowMethods } from "@/lib/server/apiGuards";
import { isValidMessageId, loadMailContext } from "@/lib/server/mailRoute";
import { invitationFor } from "@/lib/server/mailAttachments";
import { buildMailEventRow } from "@/lib/server/mailEvents";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["POST"])) return;
  res.setHeader("Cache-Control", CACHE_CONTROL.private);
  const { accountId, messageId } = (req.body ?? {}) as { accountId?: unknown; messageId?: unknown };
  if (!isValidMessageId(messageId)) return res.status(400).json({ error: "Nieprawidłowy identyfikator wiadomości." });
  const ctx = await loadMailContext(req, res, accountId);
  if (!ctx) return;

  try {
    const message = await ctx.client.getMessage(messageId);
    const invitation = await invitationFor(ctx.client, message);
    if (!invitation) return res.status(422).json({ error: "Nie wykryto zaproszenia w tej wiadomości." });

    const built = buildMailEventRow(invitation, ctx.userId);
    if ("error" in built) return res.status(422).json({ error: built.error });

    const { data, error } = await ctx.supabase.from("events").insert(built.row).select("id").single();
    if (error || !data) {
      console.error("[mail/event] zapis wydarzenia:", error?.message);
      return res.status(500).json({ error: "Nie udało się dodać wydarzenia." });
    }
    return res.status(201).json({ eventId: data.id });
  } catch (err) {
    console.error("[mail/event] odczyt wiadomości:", err);
    return res.status(502).json({ error: "Nie udało się pobrać wiadomości." });
  }
}
