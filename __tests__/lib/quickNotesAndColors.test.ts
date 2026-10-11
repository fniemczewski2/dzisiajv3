// __tests__/lib/quickNotesAndColors.test.ts

import { describe, it, expect } from "vitest";
import { splitQuickNoteText, stripBullet, readQuickNoteText, MAX_QUICK_NOTES_PER_SUBMIT } from "@/lib/quickNotes";
import { CATEGORY_PALETTE, normalizeCategoryColors, remapCategoryColors } from "@/lib/categoryColors";
import { validateReminders, MAX_TASK_REMINDERS } from "@/lib/taskReminders";

describe("szybkie notatki", () => {
  it("„- test” daje punkt „test”", () => {
    expect(stripBullet("- test")).toBe("test");
    expect(stripBullet("• kupić bilety")).toBe("kupić bilety");
    expect(stripBullet("2. zadzwonić")).toBe("zadzwonić");
    expect(stripBullet("- [ ] faktura dla partnera")).toBe("faktura dla partnera");
  });

  it("dzieli tekst na linie i pomija puste", () => {
    expect(splitQuickNoteText("- a\n\n  - b  \r\nc")).toEqual(["a", "b", "c"]);
  });

  it("ogranicza liczbę punktów z jednego wpisu", () => {
    const many = Array.from({ length: 50 }, (_, i) => `punkt ${i}`).join("\n");
    expect(splitQuickNoteText(many)).toHaveLength(MAX_QUICK_NOTES_PER_SUBMIT);
  });

  it("endpoint przyjmuje JSON i czysty tekst", () => {
    expect(readQuickNoteText({ text: "abc" })).toBe("abc");
    expect(readQuickNoteText("abc")).toBe("abc");
    expect(readQuickNoteText({ nope: 1 })).toBeNull();
  });
});

describe("kolory kategorii", () => {
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  it("każdy kolor palety ma kontrast ≥ 4.5:1 z białym tekstem", () => {
    for (const c of CATEGORY_PALETTE) {
      expect((1.05) / (lum(c.value) + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("odrzuca kolory spoza palety", () => {
    expect(normalizeCategoryColors({ praca: "#1D5FB0", dom: "#ff00ff", x: 3 })).toEqual({ praca: "#1D5FB0" });
    expect(normalizeCategoryColors(null)).toEqual({});
  });

  it("zmiana nazwy przenosi kolor, usunięcie go zdejmuje", () => {
    expect(remapCategoryColors({ praca: "#1D5FB0", stare: "#B83232" }, [["praca", "JDG"]], ["JDG"])).toEqual({ JDG: "#1D5FB0" });
  });
});

describe("przypomnienia o zadaniu", () => {
  const now = new Date("2026-10-10T12:00:00");

  it("przyjmuje do 5 przyszłych przypomnień", () => {
    expect(validateReminders(["2026-10-11T09:00", "2026-10-12T09:00"], now)).toBeNull();
  });

  it("odrzuca szóste, przeszłe i zduplikowane", () => {
    const six = Array.from({ length: MAX_TASK_REMINDERS + 1 }, (_, i) => `2026-10-1${i + 1}T09:00`);
    expect(validateReminders(six, now)).toMatch(/najwyżej 5/);
    expect(validateReminders(["2026-10-09T09:00"], now)).toMatch(/przyszłości/);
    expect(validateReminders(["2026-10-11T09:00", "2026-10-11T09:00"], now)).toMatch(/tę samą/);
  });
});
