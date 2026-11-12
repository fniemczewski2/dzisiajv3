// scripts/codemap.mjs
//
// Generuje docs/CODEMAP.md: katalog plików źródłowych (ścieżka, opis z nagłówka, eksporty, tabele Supabase,
// metody HTTP endpointów). Cel: szybkie wskazanie pliku bez przeszukiwania repozytorium.
// Użycie: `npm run codemap` (zapis), `npm run codemap:check` (błąd, gdy plik jest nieaktualny).

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const OUT = "docs/CODEMAP.md";
const SRC = /\.(ts|tsx|mjs|js|sql)$/;
const SKIP = [/^__tests__\//, /^public\//, /^docs\//, /\.d\.ts$/, /^next-env\.d\.ts$/];
const MAX_DESC = 160;
const MAX_EXPORTS = 8;

const files = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .filter((f) => f && SRC.test(f) && !SKIP.some((r) => r.test(f)))
  .sort((a, b) => a.localeCompare(b));

const clip = (s) => {
  const t = s.replace(/\s+/g, " ").replace(/`/g, "'").trim();
  if (t.length <= MAX_DESC) return t;
  const cut = t.slice(0, MAX_DESC);
  const dot = cut.lastIndexOf(". ");
  return dot > 60 ? cut.slice(0, dot + 1) : `${cut.replace(/\s\S*$/, "")}…`;
};

function headerDescription(src, path) {
  const lines = src.split("\n");
  let i = 0;
  const commentPrefix = path.endsWith(".sql") ? "--" : "//";
  if (lines[0]?.trim().startsWith(commentPrefix) && lines[0].includes(path.split("/").pop())) i = 1;
  const out = [];
  for (; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l.startsWith(commentPrefix)) break;
    const text = l.slice(commentPrefix.length).trim();
    if (text) out.push(text);
  }
  if (out.length) return out.join(" ");
  // Fallback: JSDoc bezpośrednio nad pierwszym eksportem (nie opisy propsów ani pól).
  const m = /\/\*\*((?:(?!\*\/)[\s\S])*?)\*\/\s*\n\s*export\s/.exec(src);
  if (m) {
    return m[1]
      .split("\n")
      .map((l) => l.replace(/^\s*\*\s?/, "").trim())
      .filter((l) => l && !l.startsWith("@"))
      .join(" ");
  }
  return "";
}

function exportsOf(src) {
  const names = new Set();
  const re = /export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|const|let|class|enum)\s+([A-Za-z0-9_$]+)/g;
  for (const m of src.matchAll(re)) names.add(m[1]);
  if (/export\s+default\s+(?!function|class|async)/.test(src)) names.add("default");
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(",")) {
      const n = part
        .trim()
        .split(/\s+as\s+/)
        .pop()
        ?.replace(/^type\s+/, "");
      if (n) names.add(n);
    }
  }
  const list = [...names];
  return list.length > MAX_EXPORTS ? [...list.slice(0, MAX_EXPORTS), `+${list.length - MAX_EXPORTS}`] : list;
}

const uniq = (arr) => [...new Set(arr)];
const tablesOf = (src) => uniq([...src.matchAll(/\.from\(\s*["'`]([a-z0-9_]+)["'`]\s*\)/g)].map((m) => m[1]));
const rpcOf = (src) => uniq([...src.matchAll(/\.rpc\(\s*["'`]([a-z0-9_]+)["'`]/g)].map((m) => m[1]));
const methodsOf = (src) =>
  uniq([...src.matchAll(/method\s*(?:===|!==|==)\s*["'`](GET|POST|PUT|PATCH|DELETE)["'`]/g)].map((m) => m[1]));
const sqlObjectsOf = (src) =>
  uniq(
    [
      ...src.matchAll(
        /create\s+(?:or\s+replace\s+)?(?:table|function|view|policy|trigger)\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)/gi
      ),
    ].map((m) => m[1])
  ).slice(0, 10);

function describe(path) {
  const src = readFileSync(path, "utf8");
  const parts = [];
  const desc = clip(headerDescription(src, path));
  if (desc) parts.push(desc);
  if (path.endsWith(".sql")) {
    const objs = sqlObjectsOf(src);
    if (objs.length) parts.push(`obj: ${objs.join(", ")}`);
  } else {
    const base = path
      .split("/")
      .pop()
      .replace(/\.\w+$/, "");
    let ex = exportsOf(src);
    // Endpointy: „handler” i „config” są w każdym pliku.
    if (path.startsWith("pages/api/")) ex = ex.filter((n) => n !== "handler" && n !== "config");
    // Pojedynczy eksport o nazwie pliku (komponent, hook) nic nie wnosi.
    const trivial = ex.length === 1 && (ex[0] === base || ex[0] === "default");
    if (ex.length && !trivial) parts.push(`exp: ${ex.join(", ")}`);
  }
  if (path.startsWith("pages/api/")) {
    const m = methodsOf(src);
    if (m.length) parts.push(`http: ${m.join(",")}`);
  }
  const t = tablesOf(src);
  if (t.length) parts.push(`db: ${t.join(", ")}`);
  const r = rpcOf(src);
  if (r.length) parts.push(`rpc: ${r.join(", ")}`);
  return parts.join(" · ");
}

const groupOf = (f) => {
  const seg = f.split("/");
  if (seg.length === 1) return "(root)";
  if (["pages", "lib", "hooks", "components", "supabase"].includes(seg[0]) && seg.length > 2) {
    return seg
      .slice(0, seg[0] === "supabase" || seg[1] === "api" ? 3 : 2)
      .join("/")
      .replace(/\/[^/]+\.\w+$/, "");
  }
  return seg[0];
};

const groups = new Map();
for (const f of files) {
  const g = groupOf(f);
  if (!groups.has(g)) groups.set(g, []);
  groups.get(g).push(f);
}

const testCount = execFileSync("git", ["ls-files", "__tests__"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean).length;

let md = `<!-- Plik generowany: npm run codemap. Nie edytować ręcznie. -->

# Mapa kodu Dzisiaj.Fun

Format wpisu: \`ścieżka\` – opis z nagłówka · exp: eksporty · http: metody · db: tabele Supabase · rpc: funkcje.
Testy (${testCount} plików): \`__tests__/<ta sama ścieżka>.test.ts(x)\`. Architektura: [ARCHITECTURE.md](ARCHITECTURE.md), API: [API.md](API.md).

`;
for (const [g, list] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
  md += `## ${g}\n\n`;
  for (const f of list) {
    const d = describe(f);
    const name = g === "(root)" ? f : f.slice(g.length + 1);
    md += d ? `- \`${name}\` – ${d}\n` : `- \`${name}\`\n`;
  }
  md += "\n";
}

if (process.argv.includes("--check")) {
  const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (current !== md) {
    console.error(`${OUT} jest nieaktualny – uruchom: npm run codemap`);
    process.exit(1);
  }
  console.log(`${OUT} aktualny (${files.length} plików).`);
} else {
  writeFileSync(OUT, md);
  console.log(`Zapisano ${OUT}: ${files.length} plików, ${groups.size} grup.`);
}
