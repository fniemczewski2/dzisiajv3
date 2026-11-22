// lib/mail/ticketNotice.ts
//
// Treść odpowiedzi na wiadomość z biletem. Odpowiedź wysyła bramka poczty (docs/mail-gateway/worker.js)
// jako reply na przekierowaną wiadomość: nadawcą jest adres biletów b-<token>@…, adresatem autor
// przekierowania. Aplikacja zwraca tę treść w odpowiedzi /api/mail/inbound, nie wysyła jej sama.

import { describeRow, type TicketImportResult } from "@/lib/server/ticketInbound";

export type TicketNotice = { ok: true; result: TicketImportResult } | { ok: false; reason: string };

export function ticketNoticeSubject(notice: TicketNotice): string {
  if (!notice.ok) return "Bilet: nie udało się dodać";
  const { added, duplicates, unreadable } = notice.result;
  if (added > 0) return `Bilet: dodano ${added} ${added === 1 ? "odcinek" : "odcinki/odcinków"}`;
  if (duplicates > 0) return "Bilet: już był w aplikacji";
  if (unreadable > 0) return "Bilet: nie rozpoznano załącznika";
  return "Bilet: brak danych do dodania";
}

export function ticketNoticeBody(notice: TicketNotice, subject: string): string {
  const header = `Wiadomość: ${subject || "(bez tematu)"}`;
  if (!notice.ok) {
    return [header, "", `Błąd zapisu biletu: ${notice.reason}`, "Bilet nie został dodany – prześlij go ponownie."].join(
      "\n"
    );
  }
  const { added, duplicates, unreadable, addedRows, diagnostics } = notice.result;
  const lines = [header, ""];
  if (added > 0) {
    lines.push("Dodano do „Pociągów” (do sprawdzenia):");
    for (const row of addedRows) lines.push(`- ${describeRow(row)}`);
  }
  if (duplicates > 0) lines.push(`Pominięto jako już zapisane: ${duplicates}.`);
  if (unreadable > 0) lines.push(`Załączniki PDF bez rozpoznanego biletu PKP Intercity: ${unreadable}.`);
  if (added === 0 && duplicates === 0 && unreadable === 0) lines.push("W wiadomości nie było załącznika PDF.");
  if (diagnostics?.length) {
    lines.push("", "Szczegóły:");
    for (const line of diagnostics) lines.push(`- ${line}`);
    lines.push("", "Wiadomość została zachowana w module Poczta – bilet można dodać ręcznie.");
  }
  return lines.join("\n");
}
