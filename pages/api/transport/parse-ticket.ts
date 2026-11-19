// pages/api/transport/parse-ticket.ts

import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "node:fs/promises";
import os from "node:os";
import { createServerSupabase } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/server/rateLimit";
import { extractPdfText, PdfReadError } from "@/lib/server/ticketPdf";
import { parseTicketData } from "@/lib/ticketParser";
import { TICKET_UPLOAD_MAX_BYTES, TICKET_ALLOWED_MIME } from "@/config/limits";

export const config = { api: { bodyParser: false }, maxDuration: 30 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Metoda niedozwolona." });

  const supabase = createServerSupabase(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Brak autoryzacji." });
  if (!(await enforceRateLimit(res, "parseTicket", user.id))) return;

  const form = formidable({
    multiples: false,
    maxFiles: 1,
    uploadDir: os.tmpdir(),
    maxFileSize: TICKET_UPLOAD_MAX_BYTES,
    filter: (part) => part.mimetype === TICKET_ALLOWED_MIME,
  });

  let filepath: string | undefined;

  try {
    const [, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: "Nie wgrano pliku PDF z biletem." });
    }
    filepath = file.filepath;

    if (file.mimetype !== TICKET_ALLOWED_MIME) {
      return res.status(415).json({ error: "Obsługiwane są wyłącznie pliki PDF." });
    }

    const dataBuffer = await fs.readFile(file.filepath);
    const rawText = await extractPdfText(dataBuffer);
    const ticketData = parseTicketData(rawText);

    if (!ticketData.trainNumber && !ticketData.from) {
      return res.status(422).json({
        error: "Nie udało się rozpoznać danych biletu w tym pliku. Sprawdź, czy to bilet PKP Intercity w formacie PDF.",
      });
    }

    return res.status(200).json(ticketData);
  } catch (error) {
    const code = (error as { code?: string | number }).code;

    if (code === "ETOOBIG" || code === 1009) {
      const maxMb = Math.round(TICKET_UPLOAD_MAX_BYTES / (1024 * 1024));
      return res.status(413).json({ error: `Plik jest za duży. Maksymalny rozmiar to ${maxMb} MB.` });
    }

    console.error("[parse-ticket]:", error);

    if (error instanceof PdfReadError) {
      return res.status(422).json({ error: "Nie udało się odczytać treści PDF." });
    }

    return res.status(500).json({ error: "Błąd wczytywania PDF. Sprawdź, czy plik nie jest uszkodzony." });
  } finally {
    if (filepath) {
      await fs.unlink(filepath).catch((unlinkErr: unknown) => {
        console.error("[parse-ticket] Nie udało się usunąć pliku tymczasowego", unlinkErr);
      });
    }
  }
}
