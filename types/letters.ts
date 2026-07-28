// types/letters.ts

export const LETTER_CATEGORIES = [
  "UDIP",
  "Wniosek",
  "Skarga",
  "Wykroczenie drogowe",
  "Wykroczenie",
  "Przestępstwo",
  "Inne",
] as const;

export type LetterCategory = (typeof LETTER_CATEGORIES)[number];

/** Stałe kody kategorii użyte w sygnaturze (nr/mm/rrrr/KOD). "Inne" nie ma
 * stałego kodu — użytkownik podaje własny (2-3 znaki) w formularzu. */
export const CATEGORY_CODE_MAP: Record<Exclude<LetterCategory, "Inne">, string> = {
  UDIP: "U",
  Wniosek: "A",
  Skarga: "S",
  "Wykroczenie drogowe": "RD",
  Wykroczenie: "W",
  Przestępstwo: "K",
};

/** Liczba dni do wyliczenia domyślnej response_date = issue_date + N.
 * Tylko sugestia w UI — pole zostaje edytowalne. "Inne" nie ma reguły. */
export const RESPONSE_DAYS_MAP: Record<Exclude<LetterCategory, "Inne">, number> = {
  UDIP: 14,
  Wniosek: 31,
  Skarga: 31,
  "Wykroczenie drogowe": 60,
  Wykroczenie: 60,
  Przestępstwo: 90,
};

export interface Letter {
  id: string;
  user_id: string;

  category: LetterCategory;
  category_other: string | null;
  category_code: string;

  sequence_number: number;
  sequence_year: number;
  signature: string;

  issue_date: string;
  response_date: string | null;

  recipient: string;
  description: string;

  license_plate_number: string | null;
  incident_date: string | null;
  incident_place: string | null;

  letter_file_path: string | null;
  response_file_path: string | null;

  created_at: string;
  updated_at: string;
}

/** Payload tworzenia pisma. category_code jest wymagany tylko dla "Inne"
 * (dla kategorii stałych serwer wylicza go sam w triggerze i nadpisze
 * cokolwiek zostanie tu przekazane). */
export type LetterInsert = {
  category: LetterCategory;
  category_other?: string | null;
  category_code?: string;
  issue_date: string;
  response_date?: string | null;
  recipient: string;
  description: string;
  license_plate_number?: string | null;
  incident_date?: string | null;
  incident_place?: string | null;
};

/** Pola edytowalne po utworzeniu. Celowo BEZ category/category_code/signature/
 * sequence_* — zmiana kategorii po fakcie unieważniłaby już przyznaną
 * sygnaturę i numerację, więc nie jest wspierana w tym module. */
export type LetterUpdate = Partial<{
  issue_date: string;
  response_date: string | null;
  recipient: string;
  description: string;
  license_plate_number: string | null;
  incident_date: string | null;
  incident_place: string | null;
}>;

export type LetterFileKind = "letter" | "response";
