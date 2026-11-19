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

/** Jednostka terminu: dni (art. 57 § 1 KPA), tygodnie (§ 2), miesiące (§ 3). */
export type TermUnit = "days" | "weeks" | "months";

export interface ResponseTerm {
  id: string;
  count: number;
  unit: TermUnit;
  /** Podstawa prawna i warunek zastosowania – pokazywane pod polem terminu. */
  basis: string;
}

/**
 * Ustawowe terminy odpowiedzi liczone od dnia złożenia pisma (doręczenia organowi). Pierwszy wariant jest
 * domyślny; kolejne – gdy organ przedłużył termin albo sprawa ma inny charakter. Wykroczenia: termin dotyczy
 * czynności wyjaśniających i biegnie od ich wszczęcia, więc data jest szacunkiem.
 */
export const RESPONSE_TERMS: Record<Exclude<LetterCategory, "Inne">, readonly ResponseTerm[]> = {
  UDIP: [
    { id: "udip-14d", count: 14, unit: "days", basis: "art. 13 ust. 1 ustawy o dostępie do informacji publicznej" },
    {
      id: "udip-2m",
      count: 2,
      unit: "months",
      basis: "art. 13 ust. 2 ustawy o dostępie do informacji publicznej – po zawiadomieniu o przedłużeniu",
    },
  ],
  Wniosek: [
    { id: "kpa-244", count: 1, unit: "months", basis: "art. 244 § 1 w zw. z art. 237 § 1 KPA (wniosek, dział VIII)" },
    {
      id: "kpa-35-1m",
      count: 1,
      unit: "months",
      basis: "art. 35 § 3 KPA – sprawa wymagająca postępowania wyjaśniającego",
    },
    { id: "kpa-35-2m", count: 2, unit: "months", basis: "art. 35 § 3 KPA – sprawa szczególnie skomplikowana" },
  ],
  Skarga: [{ id: "kpa-237", count: 1, unit: "months", basis: "art. 237 § 1 KPA" }],
  "Wykroczenie drogowe": [
    { id: "kpsw-54", count: 1, unit: "months", basis: "art. 54 § 1 KPSW – czynności wyjaśniające (od ich wszczęcia)" },
  ],
  Wykroczenie: [
    { id: "kpsw-54", count: 1, unit: "months", basis: "art. 54 § 1 KPSW – czynności wyjaśniające (od ich wszczęcia)" },
  ],
  Przestępstwo: [
    {
      id: "kpk-306",
      count: 6,
      unit: "weeks",
      basis: "art. 306 § 3 KPK – po tym terminie przysługuje zażalenie na bezczynność",
    },
  ],
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
