// pages/api/quick-notes.ts
//
// Dodawanie szybkich notatek ze Skrótów iPhone'a (np. „Podyktuj tekst” →
// „Pobierz zawartość URL”). Ten sam token co dla czasu pracy:
//
//   POST /api/quick-notes
//   Authorization: Bearer dzs_…
//   { "text": "kupić bilety\n- zadzwonić do fundacji" }
//
// Każda linia to osobny punkt (znaczniki list są zdejmowane).

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { looksLikeShortcutToken } from "@/lib/server/shortcutTokens";
import { extractShortcutToken, resolveShortcutUser } from "@/lib/server/shortcutAuth";
import { checkRateLimit, clientIp } from "@/lib/server/rateLimit";
import { MAX_QUICK_NOTE_LENGTH, MAX_QUICK_NOTES_PER_SUBMIT, readQuickNoteText, splitQuickNoteText } from "@/lib/quickNotes";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metoda niedozwolona." });
  }

  if (!checkRateLimit(`quick-notes:${clientIp(req)}`, 30, 60_000)) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ error: "Zbyt wiele żądań. Spróbuj ponownie za chwilę." });
  }

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
    const userId = await resolveShortcutUser(supabaseAdmin, token);
    if (!userId) return res.status(401).json({ error: "Brak autoryzacji." });

    const { error } = await supabaseAdmin
      .from("quick_notes")
      .insert(items.map((content) => ({ user_id: userId, content, source: "shortcut" })));

    if (error) {
      if (error.code === "23514") return res.status(409).json({ error: error.message });
      throw error;
    }

    const message = items.length === 1 ? "Dodano notatkę." : `Dodano punkty notatki: ${items.length}.`;
    return res.status(201).json({ success: true, count: items.length, message });
  } catch (error) {
    console.error("Błąd quick-notes:", error);
    return res.status(500).json({ error: "Błąd serwera." });
  }
}
