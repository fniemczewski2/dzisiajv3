// pages/api/mail/inbox.ts
//
// Odczyt i usuwanie przekierowanych wiadomości zalogowanego użytkownika (wygasłe nie są zwracane).

import type { NextApiRequest, NextApiResponse } from "next";
import { CACHE_CONTROL } from "@/config/server";
import { allowMethods, requireUser } from "@/lib/server/apiGuards";
import { decryptToken } from "@/lib/server/tokenCrypto";
import { isUuid } from "@/lib/server/mailRoute";
import { invitationOf, parseInboundPayload } from "@/lib/mail/inbound";

const INBOX_PAGE_SIZE = 50;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET", "DELETE"])) return;
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase } = auth;
  res.setHeader("Cache-Control", CACHE_CONTROL.private);

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("mail_inbox")
      .select("id, payload_encrypted, received_at, expires_at")
      .gt("expires_at", new Date().toISOString())
      .order("received_at", { ascending: false })
      .limit(INBOX_PAGE_SIZE);
    if (error) return res.status(500).json({ error: "Nie udało się pobrać wiadomości." });

    const messages = (data ?? []).flatMap((row) => {
      try {
        const message = parseInboundPayload(JSON.parse(decryptToken(row.payload_encrypted as string)));
        if (!message) return [];
        return [
          {
            id: row.id as string,
            from: message.from,
            subject: message.subject,
            text: message.text,
            html: message.html,
            receivedAt: row.received_at as string,
            expiresAt: row.expires_at as string,
            invitation: invitationOf(message),
          },
        ];
      } catch (err) {
        console.warn("[mail/inbox] nieczytelny wpis bufora:", err);
        return [];
      }
    });
    return res.status(200).json({ messages });
  }

  const { id } = req.query;
  if (!isUuid(id)) return res.status(400).json({ error: "Nieprawidłowy identyfikator." });
  const { data, error } = await supabase.from("mail_inbox").delete().eq("id", id).select("id");
  if (error) return res.status(500).json({ error: "Nie udało się usunąć wiadomości." });
  if (!data || data.length === 0) return res.status(404).json({ error: "Nie znaleziono wiadomości." });
  return res.status(204).end();
}
