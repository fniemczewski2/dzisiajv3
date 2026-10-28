// lib/mail/addresses.ts

/** Adres e-mail z nagłówka „Imię <adres@domena>” albo „adres@domena”. */
export function extractAddress(headerValue: string): string | null {
  const angle = /<([^<>\s]+@[^<>\s]+)>/.exec(headerValue);
  const raw = (angle ? angle[1] : headerValue).trim();
  return /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(raw) ? raw.toLowerCase() : null;
}
