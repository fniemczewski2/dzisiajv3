// lib/mail/addresses.ts

import { isSimpleEmail } from "@/lib/text";

/** Adres e-mail z nagłówka „Imię <adres@domena>” albo „adres@domena”. */
export function extractAddress(headerValue: string): string | null {
  const angle = /<([^<>\s@]+@[^<>\s]+)>/.exec(headerValue);
  const raw = (angle ? angle[1] : headerValue).trim();
  return isSimpleEmail(raw, ",;<>") ? raw.toLowerCase() : null;
}
