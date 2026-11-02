// lib/mail/format.ts

import { trimChars } from "@/lib/text";
import { format, isSameDay, isSameYear } from "date-fns";
import { pl } from "date-fns/locale";

/** Dziś: „14:05”; w tym roku: „3 paź”; starsze: „3.10.2025”. Niepoprawna data: pusty tekst. */
export function formatMailDate(value: string | null, now: Date = new Date()): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (isSameDay(date, now)) return format(date, "HH:mm");
  if (isSameYear(date, now)) return format(date, "d MMM", { locale: pl });
  return format(date, "d.MM.yyyy");
}

/** Nazwa nadawcy z „Imię <adres>”; bez nazwy – sam adres. */
export function senderName(from: string): string {
  const value = from.trim();
  const open = value.lastIndexOf("<");
  if (open < 0 || !value.endsWith(">")) return value;
  const address = value.slice(open + 1, -1).trim();
  const name = trimChars(value.slice(0, open), '" ');
  return name || address;
}
