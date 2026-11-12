// lib/meetingPollSignup.ts
//
// Ankiety w trybie zapisów: walidacja zapisu, komunikaty błędów funkcji bazy, siatka slotów z zajętością,
// grupowanie zapisów i eksport CSV dla organizatora. Czyste funkcje (bez dostępu do bazy i sieci).

import { MAX_RESPONDENT_NAME_LENGTH } from "@/config/limits";
import { validateEmail, validateSlot } from "@/lib/sanitize";
import { generateTimeSlots, slotEndTime, slotKey } from "@/lib/meetingPollGrid";
import type { MeetingPollBooking, MeetingPollSlot, SignupSlotCount } from "@/types/meetingPolls";

/** Wersja treści zgody pokazywanej uczestnikowi – zapisywana przy każdym zapisie (dowód, na co zgoda dotyczyła). */
export const SIGNUP_CONSENT_VERSION = "2026-11-05";
/** Maksymalna liczba slotów w jednym żądaniu (jak w funkcji bazy). */
export const MAX_BOOKING_SLOTS = 50;

export interface ValidBooking {
  name: string;
  email: string | null;
  slots: MeetingPollSlot[];
}

/** Zapis z formularza publicznego: imię, opcjonalny e-mail, sloty, wymagana zgoda. */
export function validateBookingPayload(body: unknown): ValidBooking | { error: string } {
  const input = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name || name.length > MAX_RESPONDENT_NAME_LENGTH) return { error: "Podaj imię i nazwisko (do 100 znaków)." };

  const rawEmail = input.email;
  const email = rawEmail == null || rawEmail === "" ? null : validateEmail(rawEmail);
  if (rawEmail != null && rawEmail !== "" && !email) return { error: "Podaj poprawny adres e-mail." };

  if (input.consent !== true) return { error: "Aby się zapisać, zaakceptuj zgodę na przetwarzanie danych." };

  const rawSlots = Array.isArray(input.slots) ? input.slots.map(validateSlot) : [];
  if (rawSlots.length === 0) return { error: "Wybierz przynajmniej jeden termin." };
  if (rawSlots.includes(null)) return { error: "Nieprawidłowy format terminu." };
  const unique = new Map((rawSlots as MeetingPollSlot[]).map((s) => [slotKey(s.date, s.start_time), s]));
  if (unique.size > MAX_BOOKING_SLOTS) return { error: "Zbyt wiele wybranych terminów." };

  return { name, email, slots: [...unique.values()] };
}

/** Klucz osoby jak w bazie: e-mail małymi literami, a bez niego imię małymi literami. */
export function personKey(name: string, email: string | null): string {
  return (email?.trim() ? email.trim() : name.trim()).toLowerCase();
}

export type BookingRpcResult =
  | { ok: true; booked: number }
  | { ok: false; error: string; slot?: { date: string; start_time: string }; max?: number; existing?: number };

const slotText = (slot?: { date: string; start_time: string }) =>
  slot ? `${slot.date} ${slot.start_time}` : "ten termin";

/** Kod błędu funkcji bazy → status HTTP i komunikat dla uczestnika. */
export function bookingFailure(result: Extract<BookingRpcResult, { ok: false }>): { status: number; message: string } {
  switch (result.error) {
    case "not_found":
      return { status: 404, message: "Ankieta nie istnieje." };
    case "not_signup":
      return { status: 409, message: "Ta ankieta nie przyjmuje zapisów na terminy." };
    case "closed":
      return { status: 409, message: "Zapisy w tej ankiecie są już zamknięte." };
    case "full":
      return { status: 409, message: `Termin ${slotText(result.slot)} został już zajęty. Wybierz inny.` };
    case "already_booked":
      return { status: 409, message: `Jesteś już zapisany(-a) na termin ${slotText(result.slot)}.` };
    case "limit":
      return {
        status: 409,
        message: `Możesz zapisać się na najwyżej ${result.max ?? 1} ${(result.max ?? 1) === 1 ? "termin" : "terminów"} (masz już ${result.existing ?? 0}).`,
      };
    case "invalid_name":
    case "no_slots":
    case "too_many_slots":
      return { status: 400, message: "Nieprawidłowe dane zapisu." };
    default:
      return { status: 500, message: "Nie udało się zapisać. Spróbuj ponownie." };
  }
}

export interface SignupSlot {
  start_time: string;
  end_time: string;
  booked: number;
  free: number;
  full: boolean;
}

export interface SignupDay {
  date: string;
  slots: SignupSlot[];
}

/** Siatka slotów ankiety zapisów z liczbą zajętych i wolnych miejsc (bez danych osób). */
export function buildSignupDays(
  dates: readonly string[],
  timeStart: string,
  timeEnd: string,
  durationMinutes: number,
  counts: readonly SignupSlotCount[],
  capacity: number
): SignupDay[] {
  const booked = new Map<string, number>();
  for (const c of counts) {
    const key = slotKey(c.date, c.start_time.slice(0, 5));
    booked.set(key, (booked.get(key) ?? 0) + c.booked);
  }
  const times = generateTimeSlots(timeStart, timeEnd, durationMinutes);
  return [...dates]
    .sort((a, b) => a.localeCompare(b))
    .map((date) => ({
      date,
      slots: times.map((start) => {
        const taken = booked.get(slotKey(date, start)) ?? 0;
        const free = Math.max(0, capacity - taken);
        return {
          start_time: start,
          end_time: slotEndTime(start, durationMinutes),
          booked: taken,
          free,
          full: free === 0,
        };
      }),
    }));
}

/** Zliczenie wierszy zapisów według slotu: [{date, start_time, booked}]. */
export function countBySlot(rows: readonly { date: string; start_time: string }[]): SignupSlotCount[] {
  const counts = new Map<string, SignupSlotCount>();
  for (const row of rows) {
    const start = row.start_time.slice(0, 5);
    const key = slotKey(row.date, start);
    const current = counts.get(key);
    if (current) current.booked++;
    else counts.set(key, { date: row.date, start_time: start, booked: 1 });
  }
  return [...counts.values()];
}

export interface BookingSlotGroup {
  date: string;
  start_time: string;
  end_time: string;
  bookings: MeetingPollBooking[];
}

/** Zapisy zgrupowane według slotu, chronologicznie; w slocie według czasu zapisu. */
export function groupBookings(rows: readonly MeetingPollBooking[], durationMinutes: number): BookingSlotGroup[] {
  const groups = new Map<string, BookingSlotGroup>();
  for (const row of rows) {
    const start = row.start_time.slice(0, 5);
    const key = slotKey(row.date, start);
    const group = groups.get(key) ?? {
      date: row.date,
      start_time: start,
      end_time: slotEndTime(start, durationMinutes),
      bookings: [],
    };
    group.bookings.push(row);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, bookings: [...g.bookings].sort((a, b) => a.created_at.localeCompare(b.created_at)) }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
}

/**
 * Komórka CSV (separator „;” jak w polskim Excelu): cudzysłowy podwajane, a wartości zaczynające się od znaku
 * formuły (=, +, -, @, tabulator, CR) poprzedzane apostrofem – imię wpisane przez uczestnika nie może uruchomić
 * formuły w arkuszu organizatora (CSV injection).
 */
export function csvCell(value: string | null | undefined): string {
  const text = value ?? "";
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[";\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** CSV zapisów dla organizatora (z BOM, żeby Excel poprawnie odczytał polskie znaki). */
export function bookingsToCsv(rows: readonly MeetingPollBooking[], durationMinutes: number): string {
  const header = ["Data", "Od", "Do", "Imię i nazwisko", "E-mail", "Zapisano"].join(";");
  const lines = groupBookings(rows, durationMinutes).flatMap((group) =>
    group.bookings.map((b) =>
      [group.date, group.start_time, group.end_time, csvCell(b.name), csvCell(b.email), b.created_at]
        .map((cell) => (typeof cell === "string" ? cell : ""))
        .join(";")
    )
  );
  return `\uFEFF${[header, ...lines].join("\r\n")}\r\n`;
}
