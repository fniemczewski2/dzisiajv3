// pages/api/mail/inbox/action.ts
//
// Dodaje zadanie albo wydarzenie z przekierowanej wiadomości. Wiersz zapisuje sesja użytkownika (RLS).

import type { NextApiRequest, NextApiResponse } from "next";
import { CACHE_CONTROL } from "@/config/server";
import { allowMethods, requireUser } from "@/lib/server/apiGuards";
import { decryptToken } from "@/lib/server/tokenCrypto";
import { isUuid } from "@/lib/server/mailRoute";
import { getAppDate } from "@/lib/dateUtils";
import { inboxActionRow } from "@/lib/mail/inboxActions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["POST"])) return;
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, user } = auth;
  res.setHeader("Cache-Control", CACHE_CONTROL.private);

  const { id, action } = (req.body ?? {}) as { id?: unknown; action?: unknown };
  if (!isUuid(id)) return res.status(400).json({ error: "Nieprawidłowy identyfikator." });
  if (action !== "task" && action !== "event") return res.status(400).json({ error: "Nieznana akcja." });

  const { data: row } = await supabase
    .from("mail_inbox")
    .select("payload_encrypted")
    .eq("id", id)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!row) return res.status(404).json({ error: "Nie znaleziono wiadomości." });

  let payload: unknown;
  try {
    payload = JSON.parse(decryptToken(row.payload_encrypted as string));
  } catch (err) {
    console.error("[mail/inbox/action] odczyt bufora:", err);
    return res.status(500).json({ error: "Nie udało się odczytać wiadomości." });
  }

  const built = inboxActionRow(payload, action, user.id, getAppDate());
  if ("error" in built) return res.status(422).json({ error: built.error });

  if (built.kind === "task") {
    const { data, error } = await supabase.from("tasks").insert(built.row).select("id").single();
    if (error || !data) return res.status(500).json({ error: "Nie udało się utworzyć zadania." });
    return res.status(201).json({ taskId: data.id });
  }
  const { data, error } = await supabase.from("events").insert(built.row).select("id").single();
  if (error || !data) return res.status(500).json({ error: "Nie udało się dodać wydarzenia." });
  return res.status(201).json({ eventId: data.id });
}
