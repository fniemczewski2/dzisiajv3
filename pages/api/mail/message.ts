// pages/api/mail/message.ts
//
// Pełna treść wiadomości na żądanie użytkownika + wykryte zaproszenie. Treść nie jest zapisywana.

import type { NextApiRequest, NextApiResponse } from "next";
import { CACHE_CONTROL } from "@/config/server";
import { allowMethods } from "@/lib/server/apiGuards";
import { isValidMessageId, loadMailContext } from "@/lib/server/mailRoute";
import { invitationFor } from "@/lib/server/mailAttachments";
import { inlineImageDataUris } from "@/lib/server/mailInlineImages";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET"])) return;
  res.setHeader("Cache-Control", CACHE_CONTROL.private);
  const { id } = req.query;
  if (!isValidMessageId(id)) return res.status(400).json({ error: "Nieprawidłowy identyfikator wiadomości." });
  const ctx = await loadMailContext(req, res, req.query.accountId);
  if (!ctx) return;

  try {
    const message = await ctx.client.getMessage(id);
    const [invitation, inlineImages] = await Promise.all([
      invitationFor(ctx.client, message),
      message.html ? inlineImageDataUris(ctx.client, message) : Promise.resolve({}),
    ]);
    return res.status(200).json({
      message: {
        id: message.id,
        threadId: message.threadId,
        subject: message.subject,
        from: message.from,
        to: message.to,
        date: message.date,
        text: message.text,
        html: message.html,
        inlineImages,
        attachments: message.attachments,
      },
      invitation,
    });
  } catch (err) {
    console.error("[mail/message] odczyt wiadomości:", err);
    return res.status(502).json({ error: "Nie udało się pobrać wiadomości." });
  }
}
