// lib/mail/htmlText.ts
//
// Tekst z HTML (bez DOM) – na potrzeby wykrywania zaproszeń i podglądu, gdy wiadomość nie ma części text/plain.

import { trimWhere } from "@/lib/text";

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Usuwa znaczniki <…> w jednym przebiegu (niedomknięty „<” zostaje jako tekst). */
function stripTags(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("<", i);
    if (open < 0) return out + text.slice(i);
    const close = text.indexOf(">", open + 1);
    if (close < 0) return out + text.slice(i);
    out += text.slice(i, open);
    i = close + 1;
  }
  return out;
}

export function htmlToPlainText(html: string): string {
  const withBreaks = html
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "$2 $1")
    .replace(/<(br|\/p|\/div|\/tr|\/h\d|\/li)[^>]*>/gi, "\n");
  const decoded = stripTags(withBreaks).replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e.startsWith("#x") || e.startsWith("#X")) return String.fromCodePoint(Number.parseInt(e.slice(2), 16));
    if (e.startsWith("#")) return String.fromCodePoint(Number.parseInt(e.slice(1), 10));
    return ENTITIES[e.toLowerCase()] ?? m;
  });
  return decoded
    .split("\n")
    .map((line) => trimWhere(line, (ch) => ch === " " || ch === "\t", "end"))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
