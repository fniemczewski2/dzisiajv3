// lib/vcard.ts
//
// Jedno miejsce generowania plików vCard 3.0 (RFC 2426): publiczna wizytówka
// (/api/vcard), podgląd wizytówki i kontakt z modułu Osoby. Każda wartość jest
// escapowana, a parametry TYPE oczyszczane – dane użytkownika nie mogą
// wstrzyknąć własnych linii do pliku.

export function escVCardValue(raw: string): string {
  return raw
    .replaceAll("\\", String.raw`\\`)
    .replaceAll(/\r?\n/g, String.raw`\n`)
    .replaceAll(";", String.raw`\;`)
    .replaceAll(",", String.raw`\,`);
}

/** Usuwa polskie znaki diakrytyczne (ł nie rozkłada się w NFD, więc osobno). */
export function transliterate(text: string): string {
  return text
    .replaceAll("ł", "l")
    .replaceAll("Ł", "L")
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "");
}

export function sanitizeTypeToken(raw: string): string {
  const cleaned = raw.replaceAll(/[^A-Za-z0-9-]/g, "").toUpperCase();
  return cleaned || "OTHER";
}

/** Polskie etykiety z formularza → typy vCard rozpoznawane przez telefony. */
const VCARD_TYPE_ALIASES: Record<string, string> = {
  komorka: "CELL",
  telefon: "VOICE",
  sluzbowy: "WORK",
  praca: "WORK",
  biuro: "WORK",
  firma: "WORK",
  prywatny: "HOME",
  dom: "HOME",
  domowy: "HOME",
  fax: "FAX",
  faks: "FAX",
  "strona www": "WORK",
};

export function vcardType(label: string | null | undefined): string {
  const plain = transliterate((label ?? "").trim()).toLowerCase();
  return VCARD_TYPE_ALIASES[plain] ?? sanitizeTypeToken(plain);
}

/** Obcina podkreślenia z obu końców – liniowo (regex /_+$/ miał nadliniowy czas). */
function trimUnderscores(text: string): string {
  let start = 0;
  let end = text.length;
  while (start < end && text[start] === "_") start++;
  while (end > start && text[end - 1] === "_") end--;
  return text.slice(start, end);
}

export function safeFileName(raw: string | undefined): string {
  const cleaned = trimUnderscores((raw ?? "").replaceAll(/[^\p{L}\p{N}_-]+/gu, "_"));
  return cleaned || "wizytowka";
}

/**
 * Pole N (nazwisko;imiona;;;) – wymagane w vCard 3.0. Gdy znamy tylko pełne
 * imię i nazwisko, ostatni wyraz traktujemy jako nazwisko.
 */
export function structuredName(fullName: string, family?: string, given?: string): string {
  if (family !== undefined || given !== undefined) {
    return `${escVCardValue(family ?? "")};${escVCardValue(given ?? "")};;;`;
  }
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return `${escVCardValue(parts[0] ?? "")};;;;`;
  const last = parts.at(-1) ?? "";
  return `${escVCardValue(last)};${escVCardValue(parts.slice(0, -1).join(" "))};;;`;
}

export interface VCardInput {
  fullName: string;
  /** Nazwisko i imię, jeśli są znane osobno (moduł Osoby). */
  familyName?: string;
  givenName?: string;
  organization?: string | null;
  phones?: ReadonlyArray<{ type?: string | null; number?: string | null }>;
  emails?: ReadonlyArray<{ type?: string | null; email?: string | null }>;
  addresses?: ReadonlyArray<{ type?: string | null; address?: string | null }>;
  urls?: ReadonlyArray<{ type?: string | null; url?: string | null }>;
}

/** Plik .vcf z liniami zakończonymi CRLF, zgodnie ze specyfikacją. */
export function buildVCard(input: VCardInput): string {
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];
  lines.push(`N:${structuredName(input.fullName, input.familyName, input.givenName)}`);
  lines.push(`FN:${escVCardValue(input.fullName.trim())}`);
  if (input.organization?.trim()) lines.push(`ORG:${escVCardValue(input.organization.trim())}`);

  for (const phone of input.phones ?? []) {
    const number = phone?.number?.replaceAll(/\s+/g, "");
    if (number) lines.push(`TEL;TYPE=${vcardType(phone.type)},VOICE:${escVCardValue(number)}`);
  }
  for (const email of input.emails ?? []) {
    const value = email?.email?.trim();
    if (value) lines.push(`EMAIL;TYPE=${vcardType(email.type)},INTERNET:${escVCardValue(value)}`);
  }
  for (const address of input.addresses ?? []) {
    const value = address?.address?.trim();
    if (value) lines.push(`ADR;TYPE=${vcardType(address.type)}:;;${escVCardValue(value)};;;;`);
  }
  for (const link of input.urls ?? []) {
    const value = link?.url?.trim();
    if (value) lines.push(`URL;TYPE=${vcardType(link.type)}:${escVCardValue(value)}`);
  }

  lines.push("END:VCARD", "");
  return lines.join("\r\n");
}

/** Nagłówek Content-Disposition z nazwą pliku także dla polskich znaków (RFC 6266). */
export function vcardContentDisposition(name: string | undefined): string {
  const file = `${safeFileName(name)}.vcf`;
  const ascii =
    transliterate(file)
      .replaceAll(/[^\x20-\x7E]/g, "")
      .replaceAll('"', "") || "wizytowka.vcf";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file)}`;
}
