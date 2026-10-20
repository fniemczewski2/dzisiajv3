// __tests__/styles/headings.test.ts
//
// Spójność nagłówków sekcji: <h2> w aplikacji używa klasy `section-title`
// (albo `period-title` w nawigacji okresu) zamiast własnych rozmiarów.
// Wyjątki: strony marketingowe (start, przewodnik) i nazwa osoby w wizytówce.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ALLOWED_FILES = new Set(["pages/start.tsx", "pages/guide.tsx", "components/profiles/VCardPreview.tsx"]);
const SIZE = /\btext-(lg|xl|2xl|3xl)\b/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

describe("nagłówki sekcji", () => {
  it("<h2> nie ustawia własnego rozmiaru czcionki", () => {
    const found: string[] = [];
    for (const dir of ["components", "pages"]) {
      for (const file of files(join(process.cwd(), dir))) {
        const rel = file.replace(`${process.cwd()}/`, "");
        if (ALLOWED_FILES.has(rel)) continue;
        for (const match of readFileSync(file, "utf8").matchAll(/<h2\b[^>]*className="([^"]*)"/g)) {
          if (SIZE.test(match[1])) found.push(`${rel}: ${match[1]}`);
        }
      }
    }
    expect(found).toEqual([]);
  });

  it("karty (card, form-card, widget) nie nadpisują zaokrąglenia", () => {
    const found: string[] = [];
    for (const dir of ["components", "pages"]) {
      for (const file of files(join(process.cwd(), dir))) {
        for (const match of readFileSync(file, "utf8").matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
          const tokens = (match[1] ?? match[2]).split(/\s+/);
          const isCard = tokens.some((t) => t === "card" || t === "form-card" || t === "widget");
          if (isCard && tokens.some((t) => t === "rounded-lg" || t === "rounded-xl")) {
            const rel = file.replace(`${process.cwd()}/`, "");
            found.push(`${rel}: ${tokens.join(" ")}`);
          }
        }
      }
    }
    expect(found).toEqual([]);
  });
});
