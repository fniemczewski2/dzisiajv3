// __tests__/a11y/iconButtons.test.ts
//
// Strażnik: przycisk złożony tylko z ikony musi mieć nazwę dostępności (aria-label, aria-labelledby
// albo title). Skaner działa na źródłach TSX bez zależności parsera: liczy nawiasy klamrowe w atrybutach
// i sprawdza zawartość przycisku (tekst, wyrażenie `{...}` albo same ikony).

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const NAME_ATTR = /\b(aria-label|aria-labelledby|title)=/;

function tsxFiles(): string[] {
  return execFileSync("git", ["ls-files", "components", "pages", "providers", "lib"], { encoding: "utf8" })
    .split("\n")
    .filter((f) => f.endsWith(".tsx"));
}

/** Indeks znaku po domykającym `>` otwarcia tagu (pomija `>` w `=>` i w wyrażeniach `{...}`). */
function openingTagEnd(src: string, start: number): number {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0 && src[i - 1] !== "=") return i;
  }
  return -1;
}

/** Linie przycisków, które nie mają nazwy dostępności i nie zawierają tekstu (tylko ikony). */
function iconOnlyButtonLines(src: string): number[] {
  const lines: number[] = [];
  let pos = 0;
  while ((pos = src.indexOf("<button", pos)) !== -1) {
    const after = src.charAt(pos + "<button".length);
    if (!/[\s>/]/.test(after)) {
      pos += 1;
      continue;
    }
    const end = openingTagEnd(src, pos);
    if (end === -1) break;
    const open = src.slice(pos, end + 1);
    const selfClosing = open.endsWith("/>");
    let inner = "";
    if (!selfClosing) {
      const close = src.indexOf("</button>", end);
      inner = close === -1 ? "" : src.slice(end + 1, close);
    }
    const spread = /\{\s*\.\.\./.test(open);
    const named = NAME_ATTR.test(open);
    const innerText = inner.replace(/<[^>]*>/g, "").trim();
    const hasText = innerText.length > 0 || inner.includes("{");
    if (!named && !spread && !hasText) {
      lines.push(src.slice(0, pos).split("\n").length);
    }
    pos = end + 1;
  }
  return lines;
}

describe("przyciski złożone z samej ikony mają nazwę dostępności", () => {
  it("nie ma przycisków bez nazwy w komponentach, stronach i bibliotekach", () => {
    const offenders = tsxFiles().flatMap((f) => iconOnlyButtonLines(readFileSync(f, "utf8")).map((l) => `${f}:${l}`));
    expect(offenders, `Przyciski bez nazwy dostępności: ${offenders.join(", ")}`).toEqual([]);
  });
});

describe("skaner rozpoznaje przyciski bez nazwy", () => {
  it("wykrywa przycisk z samą ikoną", () => {
    expect(
      iconOnlyButtonLines("export const X = () => (\n  <button onClick={() => 1}>\n    <Icon />\n  </button>\n);")
    ).toEqual([2]);
  });
  it("nie zgłasza przycisku z tekstem zagnieżdżonym głębiej", () => {
    expect(iconOnlyButtonLines("<button><span><b>{q}</b></span></button>")).toEqual([]);
  });
  it("nie zgłasza przycisku z nazwą dostępności", () => {
    expect(iconOnlyButtonLines('<button aria-label="Zamknij"><X /></button>')).toEqual([]);
  });
  it("nie zgłasza przycisku ze spread-em (nazwa może pochodzić z propsów)", () => {
    expect(iconOnlyButtonLines("<button {...props}><X /></button>")).toEqual([]);
  });
});
