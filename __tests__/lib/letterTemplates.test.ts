// __tests__/lib/letterTemplates.test.ts

import { describe, it, expect } from "vitest";
import { generateLetterBody } from "@/lib/letterTemplates";
import type { Letter } from "@/types/letters";

function makeLetter(overrides: Partial<Letter> = {}): Letter {
  return {
    id: "letter-1",
    user_id: "user-1",
    category: "UDIP",
    category_other: null,
    category_code: "U",
    sequence_number: 1,
    sequence_year: 2026,
    signature: "1.08.2026.U",
    issue_date: "2026-08-19",
    response_date: null,
    recipient: "Urząd Miasta w Warszawie",
    description: "Proszę o udostępnienie rejestru umów za 2025 rok.",
    license_plate_number: null,
    incident_date: null,
    incident_place: null,
    letter_file_path: null,
    response_file_path: null,
    created_at: "2026-08-19T00:00:00Z",
    updated_at: "2026-08-19T00:00:00Z",
    ...overrides,
  };
}

describe("generateLetterBody", () => {
  it("includes the legal basis and subject for a known category", () => {
    const body = generateLetterBody(makeLetter());
    expect(body).toContain("Dotyczy: Wniosek o udostępnienie informacji publicznej");
    expect(body).toContain("ustawy z dnia 6 września 2001 r. o dostępie do informacji publicznej");
    expect(body).toContain(makeLetter().description);
    expect(body).toContain("Sygnatura pisma: 1.08.2026.U");
  });

  it("uses a different legal basis per category", () => {
    const skarga = generateLetterBody(makeLetter({ category: "Skarga", category_code: "S" }));
    expect(skarga).toContain("Kodeks postępowania administracyjnego");
    expect(skarga).toContain("Dotyczy: Skarga");

    const przestepstwo = generateLetterBody(makeLetter({ category: "Przestępstwo", category_code: "K" }));
    expect(przestepstwo).toContain("Kodeks postępowania karnego");
  });

  it("includes vehicle plate and incident details for a traffic violation", () => {
    const body = generateLetterBody(
      makeLetter({
        category: "Wykroczenie drogowe",
        category_code: "RD",
        license_plate_number: "WA12345",
        incident_date: "2026-08-01",
        incident_place: "ul. Polna, Warszawa",
      })
    );
    expect(body).toContain("Numer rejestracyjny pojazdu: WA12345");
    expect(body).toContain("Miejsce zdarzenia: ul. Polna, Warszawa");
    expect(body).toMatch(/Data zdarzenia: 1 sierpnia 2026 r\./);
  });

  it("adds a statutory-deadline reminder when a response_date is set", () => {
    const body = generateLetterBody(makeLetter({ response_date: "2026-09-02" }));
    expect(body).toMatch(/do dnia 2 września 2026 r\./);
  });

  it("falls back to the user-provided category name with no fixed legal basis for 'Inne'", () => {
    const body = generateLetterBody(
      makeLetter({ category: "Inne", category_other: "Odwołanie", category_code: "OD" })
    );
    expect(body).toContain("Dotyczy: Odwołanie");
    expect(body).not.toContain("Na podstawie");
  });
});
