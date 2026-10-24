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

export const CATEGORY_CODE_MAP: Record<Exclude<LetterCategory, "Inne">, string> = {
  UDIP: "U",
  Wniosek: "A",
  Skarga: "S",
  "Wykroczenie drogowe": "RD",
  Wykroczenie: "W",
  Przestępstwo: "K",
};

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

  created_at: string;
  updated_at: string;
}

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

export interface LetterAttachment {
  id: string;
  letter_id: string;
  user_id: string;
  kind: LetterFileKind;
  storage_path: string;
  file_name: string;
  size_bytes: number;
  created_at: string;
}
