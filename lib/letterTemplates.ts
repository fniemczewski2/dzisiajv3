// lib/letterTemplates.ts

import type { Letter, LetterCategory } from "@/types/letters";

interface LetterTemplateMeta {
  subject: string;
  legalBasis: string | null;
  opening: string;
}

const TEMPLATES: Record<Exclude<LetterCategory, "Inne">, LetterTemplateMeta> = {
  UDIP: {
    subject: "Wniosek o udostępnienie informacji publicznej",
    legalBasis:
      "art. 61 Konstytucji Rzeczypospolitej Polskiej oraz art. 2 ust. 1 i art. 10 ust. 1 ustawy z dnia 6 września 2001 r. o dostępie do informacji publicznej (t.j. Dz.U. z 2022 r. poz. 902 z późn. zm.)",
    opening: "zwracam się z wnioskiem o udostępnienie informacji publicznej, w następującym zakresie:",
  },
  Wniosek: {
    subject: "Wniosek",
    legalBasis:
      "art. 63 § 1 oraz art. 221 § 1 ustawy z dnia 14 czerwca 1960 r. – Kodeks postępowania administracyjnego (t.j. Dz.U. z 2024 r. poz. 572 z późn. zm.)",
    opening: "zwracam się z wnioskiem w następującej sprawie:",
  },
  Skarga: {
    subject: "Skarga",
    legalBasis:
      "art. 227 i n. ustawy z dnia 14 czerwca 1960 r. – Kodeks postępowania administracyjnego (t.j. Dz.U. z 2024 r. poz. 572 z późn. zm.)",
    opening: "wnoszę skargę w następującej sprawie:",
  },
  "Wykroczenie drogowe": {
    subject: "Zawiadomienie o popełnieniu wykroczenia drogowego",
    legalBasis:
      "art. 6 ustawy z dnia 24 sierpnia 2001 r. – Kodeks postępowania w sprawach o wykroczenia (t.j. Dz.U. z 2024 r. poz. 977 z późn. zm.) w związku z przepisami ustawy z dnia 20 czerwca 1997 r. – Prawo o ruchu drogowym (t.j. Dz.U. z 2024 r. poz. 1251 z późn. zm.)",
    opening: "zawiadamiam o popełnieniu wykroczenia drogowego przez kierującego następującym pojazdem:",
  },
  Wykroczenie: {
    subject: "Zawiadomienie o popełnieniu wykroczenia",
    legalBasis:
      "art. 6 ustawy z dnia 24 sierpnia 2001 r. – Kodeks postępowania w sprawach o wykroczenia (t.j. Dz.U. z 2024 r. poz. 977 z późn. zm.)",
    opening: "zawiadamiam o popełnieniu wykroczenia:",
  },
  Przestępstwo: {
    subject: "Zawiadomienie o podejrzeniu popełnienia przestępstwa",
    legalBasis: "art. 304 § 1 ustawy z dnia 6 czerwca 1997 r. – Kodeks postępowania karnego (t.j. Dz.U. z 2024 r. poz. 37 z późn. zm.)",
    opening: "zawiadamiam o podejrzeniu popełnienia przestępstwa:",
  },
};

function formatPl(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
}

export function generateLetterBody(letter: Letter): string {
  const meta: LetterTemplateMeta =
    letter.category === "Inne"
      ? {
          subject: letter.category_other?.trim() || "Pismo",
          legalBasis: null,
          opening: "zwracam się w następującej sprawie:",
        }
      : TEMPLATES[letter.category];

  const lines: string[] = [];

  lines.push(letter.recipient);
  lines.push("");

  if (meta.legalBasis) {
    lines.push(`Na podstawie ${meta.legalBasis}, ${meta.opening}` );
  }

  lines.push("");

  const detailLines: string[] = [];
  if (letter.category === "Wykroczenie drogowe" && letter.license_plate_number) {
    detailLines.push(`Numer rejestracyjny pojazdu: ${letter.license_plate_number}`);
  }
  const incidentDateLabel = formatPl(letter.incident_date);
  if (incidentDateLabel) detailLines.push(`Data zdarzenia: ${incidentDateLabel} r.`);
  if (letter.incident_place) detailLines.push(`Miejsce zdarzenia: ${letter.incident_place}`);
  if (detailLines.length > 0) {
    lines.push(...detailLines, "");
  }

  const responseDateLabel = formatPl(letter.response_date);
  if (responseDateLabel) {
    lines.push(`Uprzejmie proszę o udzielenie odpowiedzi na podany adres do e-doręczeń.`);
  }

  lines.push("");
  lines.push(`Sygn.: ${letter.signature}`);

  return lines.join("\n");
}
