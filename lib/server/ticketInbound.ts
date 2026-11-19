// lib/server/ticketInbound.ts
//
// Bilety z poczty: wiadomość przekierowana na adres b-<token>@… (np. potwierdzenie zakupu PKP Intercity).
// Każdy PDF → tekst → odcinki (lib/ticketParser.ts) → wpisy w user_trains ze źródłem „mail” i znacznikiem
// needs_review (użytkownik sprawdza i zatwierdza w „Pociągach”). Bilet przekierowany drugi raz nie tworzy
// duplikatu. Treść wiadomości i PDF nie są zapisywane.

import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_INBOUND_PDF_TOTAL_BASE64, MAX_INBOUND_PDFS } from "@/config/server";
import type { InboundMessage } from "@/lib/mail/inbound";
import { parseTicketLegs, ticketDateToIso, type ParsedTicket } from "@/lib/ticketParser";
import { extractPdfText } from "@/lib/server/ticketPdf";

export interface TrainRow {
  user_id: string;
  train_number: string;
  train_name: string;
  date: string;
  departure_time: string;
  from_station: string;
  to_station: string;
  wagon: string;
  seat: string;
  source: "mail";
  needs_review: true;
}

/** Odcinek biletu → wiersz user_trains; null, gdy brak daty, godziny lub numeru pociągu. */
export function legToRow(userId: string, leg: ParsedTicket): TrainRow | null {
  const date = ticketDateToIso(leg.date);
  if (!date || !/^\d{2}:\d{2}$/.test(leg.departureTime) || !leg.trainNumber) return null;
  return {
    user_id: userId,
    train_number: leg.trainNumber.slice(0, 20),
    train_name: leg.trainName.slice(0, 60),
    date,
    departure_time: leg.departureTime,
    from_station: leg.from.slice(0, 100),
    to_station: leg.to.slice(0, 100),
    wagon: leg.wagon.slice(0, 10),
    seat: leg.seat.slice(0, 10),
    source: "mail",
    needs_review: true,
  };
}

const rowKey = (r: Pick<TrainRow, "date" | "train_number" | "departure_time" | "wagon" | "seat">) =>
  [r.date, r.train_number, r.departure_time, r.wagon, r.seat].join("|");

/** PDF z wiadomości w limitach (liczba plików i łączny rozmiar). */
function ticketPdfs(message: InboundMessage): string[] {
  const out: string[] = [];
  let total = 0;
  for (const a of message.attachments) {
    if (!a.pdfBase64 || out.length >= MAX_INBOUND_PDFS) continue;
    if (total + a.pdfBase64.length > MAX_INBOUND_PDF_TOTAL_BASE64) break;
    total += a.pdfBase64.length;
    out.push(a.pdfBase64);
  }
  return out;
}

export interface TicketImportResult {
  added: number;
  duplicates: number;
  /** PDF bez rozpoznanego biletu lub z błędem odczytu. */
  unreadable: number;
}

export async function importTicketMail(
  admin: SupabaseClient,
  userId: string,
  message: InboundMessage,
  readText: (pdf: Buffer) => Promise<string> = extractPdfText
): Promise<TicketImportResult> {
  const rows: TrainRow[] = [];
  let unreadable = 0;
  for (const pdf of ticketPdfs(message)) {
    try {
      const legs = parseTicketLegs(await readText(Buffer.from(pdf, "base64")))
        .map((leg) => legToRow(userId, leg))
        .filter((r): r is TrainRow => r !== null);
      if (legs.length === 0) unreadable++;
      rows.push(...legs);
    } catch {
      unreadable++;
    }
  }
  if (rows.length === 0) return { added: 0, duplicates: 0, unreadable };

  const dates = [...new Set(rows.map((r) => r.date))];
  const { data: existing, error: readError } = await admin
    .from("user_trains")
    .select("date, train_number, departure_time, wagon, seat")
    .eq("user_id", userId)
    .in("date", dates);
  if (readError) throw readError;
  const known = new Set((existing ?? []).map((r) => rowKey(r as TrainRow)));
  const fresh = rows.filter((r) => {
    const key = rowKey(r);
    if (known.has(key)) return false;
    known.add(key);
    return true;
  });
  if (fresh.length > 0) {
    const { error } = await admin.from("user_trains").insert(fresh);
    if (error) throw error;
  }
  return { added: fresh.length, duplicates: rows.length - fresh.length, unreadable };
}
