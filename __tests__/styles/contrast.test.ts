// __tests__/styles/contrast.test.ts
//
// Kontrast tokenów motywu (WCAG 2.2 AA) w jasnym i ciemnym motywie.
// Wartości czytamy wprost z styles/globals.css, więc zmiana koloru, która
// psuje czytelność, zatrzyma testy.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/contrast";

const css = readFileSync(join(process.cwd(), "styles/globals.css"), "utf8");

function block(selector: ":root" | ".dark"): Record<string, string> {
  const pattern = selector === ":root" ? /\n {2}:root \{([\s\S]*?)\n {2}\}/ : /\n {2}\.dark \{([\s\S]*?)\n {2}\}/;
  const body = pattern.exec(css)?.[1] ?? "";
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})/g)) vars[m[1]] = m[2];
  return vars;
}

const THEMES = { jasny: block(":root"), ciemny: block(".dark") };
const ROLES = ["danger", "success", "warning", "info", "deco-pink", "deco-violet", "deco-cyan"] as const;
const SURFACES = ["theme-background", "theme-card", "theme-surface"] as const;

function ratio(a: string | undefined, b: string | undefined): number {
  expect(a, "brak tokenu").toBeDefined();
  expect(b, "brak tokenu").toBeDefined();
  return contrastRatio(a as string, b as string) ?? 0;
}

describe.each(Object.entries(THEMES))("motyw %s", (_name, t) => {
  it("tekst podstawowy, drugorzędny i wyciszony ≥ 4.5:1 na każdej powierzchni", () => {
    for (const fg of ["theme-text", "theme-text-secondary", "theme-text-muted", "theme-primary"]) {
      for (const bg of SURFACES) expect(ratio(t[fg], t[bg]), `${fg} na ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("obramowanie pól formularza ≥ 3:1 względem karty (WCAG 1.4.11)", () => {
    expect(ratio(t["theme-input-border"], t["theme-card"])).toBeGreaterThanOrEqual(3);
  });

  it.each(ROLES)("rola %s: tekst ≥ 4.5:1 na powierzchniach i własnym tle, biały na wypełnieniu ≥ 4.5:1", (role) => {
    for (const bg of [...SURFACES, `${role}-soft`]) {
      expect(ratio(t[`${role}-fg`], t[bg]), `${role}-fg na ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(ratio("#FFFFFF", t[`${role}-solid`]), `biały na ${role}-solid`).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#FFFFFF", t[`${role}-solid-hover`]), `biały na ${role}-solid-hover`).toBeGreaterThanOrEqual(4.5);
  });

  it("tekst na tłach notatek ≥ 4.5:1", () => {
    for (const note of ["gray", "yellow", "green", "cyan", "red"]) {
      for (const fg of ["theme-text", "theme-text-secondary", "theme-text-muted"]) {
        expect(ratio(t[fg], t[`note-${note}-bg`]), `${fg} na notatce ${note}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("plakietki priorytetów ≥ 4.5:1", () => {
    for (const p of [1, 2, 3, 4, 5])
      expect(ratio(t[`prio-${p}-fg`], t[`prio-${p}-bg`]), `priorytet ${p}`).toBeGreaterThanOrEqual(4.5);
  });
});
