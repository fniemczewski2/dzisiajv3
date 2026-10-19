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
  // Blok selektora w @layer base: od „\n  :root {” do najbliższego „\n  }”.
  const open = css.indexOf(`\n  ${selector} {`);
  const close = open === -1 ? -1 : css.indexOf("\n  }", open);
  const body = open === -1 || close === -1 ? "" : css.slice(open, close);
  const vars: Record<string, string> = {};
  // Deklaracje „--nazwa: #RRGGBB;” – podział tekstu zamiast regexu z nawracaniem.
  for (const declaration of body.split(";")) {
    const at = declaration.indexOf("--");
    const colon = declaration.indexOf(":", at);
    if (at === -1 || colon === -1) continue;
    const value = declaration.slice(colon + 1).trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) vars[declaration.slice(at + 2, colon).trim()] = value;
  }
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
