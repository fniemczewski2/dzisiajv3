// pages/api/quick-notes.ts

import { MAX_QUICK_NOTE_LENGTH, MAX_QUICK_NOTES_PER_SUBMIT } from "@/config/limits";
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { looksLikeShortcutToken } from "@/lib/server/shortcutTokens";
import { extractShortcutToken, resolveShortcutUser } from "@/lib/server/shortcutAuth";
import { clientIp, enforceRateLimit } from "@/lib/server/rateLimit";
import { readQuickNoteText, splitQuickNoteText, QUICK_NOTES_LIMIT_MESSAGE } from "@/lib/quickNotes";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metoda niedozwolona." });
  }

  if (!(await enforceRateLimit(res, "quickNotes", clientIp(req)))) return;

  const token = extractShortcutToken(req);
  if (!looksLikeShortcutToken(token)) return res.status(401).json({ error: "Brak autoryzacji." });

  const raw = readQuickNoteText(req.body);
  if (raw === null) return res.status(400).json({ error: "Brak pola „text”." });
  if (raw.length > MAX_QUICK_NOTE_LENGTH * MAX_QUICK_NOTES_PER_SUBMIT) {
    return res.status(413).json({ error: "Za długi tekst." });
  }

  const items = splitQuickNoteText(raw);
  if (items.length === 0) return res.status(400).json({ error: "Notatka jest pusta." });

  try {
    const userId = await resolveShortcutUser(supabaseAdmin(), token);
    if (!userId) return res.status(401).json({ error: "Brak autoryzacji." });

    const { error } = await supabaseAdmin()
      .from("quick_notes")
      .insert(items.map((content) => ({ user_id: userId, content, source: "shortcut" })));

    if (error) {
      if (error.code === "23514") return res.status(409).json({ error: QUICK_NOTES_LIMIT_MESSAGE });
      throw error;
    }

    const message = items.length === 1 ? "Dodano notatkę." : `Dodano punkty notatki: ${items.length}.`;
    return res.status(201).json({ success: true, count: items.length, message });
  } catch (error) {
    console.error("Błąd quick-notes:", error);
    return res.status(500).json({ error: "Nie udało się zapisać notatki. Spróbuj ponownie." });
  }
}
