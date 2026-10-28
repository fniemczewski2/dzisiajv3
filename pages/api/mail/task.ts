// pages/api/mail/task.ts
//
// Tworzy zadanie „Odpowiedz: <temat>” w kategorii „poczta” z wiadomości (bez treści w zadaniu).

import type { NextApiRequest, NextApiResponse } from "next";
import { CACHE_CONTROL } from "@/config/server";
import { allowMethods } from "@/lib/server/apiGuards";
import { isValidMessageId, loadMailContext } from "@/lib/server/mailRoute";
import { buildMailTaskRow } from "@/lib/mail/mailTasks";
import { getAppDate } from "@/lib/dateUtils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["POST"])) return;
  res.setHeader("Cache-Control", CACHE_CONTROL.private);
  const { accountId, messageId } = (req.body ?? {}) as { accountId?: unknown; messageId?: unknown };
  if (!isValidMessageId(messageId)) return res.status(400).json({ error: "Nieprawidłowy identyfikator wiadomości." });
  const ctx = await loadMailContext(req, res, accountId);
  if (!ctx) return;

  try {
    const message = await ctx.client.getMessage(messageId);
    const row = buildMailTaskRow({
      subject: message.subject,
      from: message.from,
      userId: ctx.userId,
      today: getAppDate(),
    });
    const { data, error } = await ctx.supabase.from("tasks").insert(row).select("id").single();
    if (error || !data) {
      console.error("[mail/task] zapis zadania:", error?.message);
      return res.status(500).json({ error: "Nie udało się utworzyć zadania." });
    }
    return res.status(201).json({ taskId: data.id });
  } catch (err) {
    console.error("[mail/task] odczyt wiadomości:", err);
    return res.status(502).json({ error: "Nie udało się pobrać wiadomości." });
  }
}
