// scripts/check-inline-scripts.mjs
//
// Kontrola po buildzie: każdy skrypt wykonywalny wstawiony w treść
// wygenerowanych stron musi mieć skrót dopuszczony w CSP (next.config.mjs).
// Inaczej przeglądarka zablokuje go w produkcji. Uruchamiane w `npm run build`.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { THEME_PROVIDER_PROPS } from "../config/theme.mjs";
import { themeScriptHash } from "../lib/themeScriptHash.mjs";

const PAGES_DIR = ".next/server/pages";
const allowed = new Set([themeScriptHash(THEME_PROVIDER_PROPS)]);

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith(".html") ? [path] : [];
  });
}

const problems = [];
for (const file of htmlFiles(PAGES_DIR)) {
  const html = readFileSync(file, "utf8");
  let pos = 0;
  for (;;) {
    const open = html.indexOf("<script", pos);
    if (open === -1) break;
    const tagEnd = html.indexOf(">", open);
    const close = html.indexOf("</script>", tagEnd);
    pos = close + 9;
    const attrs = html.slice(open, tagEnd);
    if (attrs.includes("src=") || attrs.includes("application/json") || attrs.includes("application/ld+json")) continue;
    const body = html.slice(tagEnd + 1, close);
    const hash = `'sha256-${createHash("sha256").update(body).digest("base64")}'`;
    if (!allowed.has(hash)) problems.push(`${file}: ${body.slice(0, 60)}…`);
  }
}

if (problems.length > 0) {
  console.error("Skrypty w treści stron bez skrótu w CSP (zostaną zablokowane w przeglądarce):");
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log("CSP: wszystkie skrypty w treści stron mają dopuszczony skrót.");
