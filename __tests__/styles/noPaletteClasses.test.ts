// __tests__/styles/noPaletteClasses.test.ts
//
// Komponenty używają tokenów semantycznych (text-text-muted, bg-danger-soft…),
// nie klas palety Tailwinda (text-gray-500, bg-red-100…) – te nie mają
// wartości dla ciemnego motywu ani sprawdzonego kontrastu.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DIRS = ["components", "pages", "config", "lib", "providers", "hooks"];
const PALETTE =
  /(?<![\w-])(?:[\w[\]&:-]+:)?(?:text|bg|border(?:-[trblxyse])?|ring|from|to|via|fill|stroke|outline|divide|decoration|accent|shadow)-(?:gray|slate|zinc|neutral|stone|red|rose|pink|orange|amber|yellow|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|lime|fuchsia)-\d{2,3}\b/g;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("klasy kolorów", () => {
  it("brak klas palety Tailwinda w kodzie aplikacji", () => {
    const found: string[] = [];
    for (const dir of DIRS) {
      for (const file of files(join(process.cwd(), dir))) {
        for (const match of readFileSync(file, "utf8").matchAll(PALETTE))
          found.push(`${file.replace(process.cwd() + "/", "")}: ${match[0]}`);
      }
    }
    expect(found).toEqual([]);
  });
});
