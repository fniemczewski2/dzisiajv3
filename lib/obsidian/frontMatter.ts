// lib/obsidian/frontMatter.ts
//
// Minimalny nagłówek YAML (front matter) dla Obsidiana. Zapisujemy wartości w składni zgodnej z JSON
// (cudzysłowy, listy w nawiasach) – to poprawny YAML. Odczyt toleruje też ręczne edycje w Obsidianie:
// wartości bez cudzysłowów i listy blokowe („- element”).

export type FrontMatterValue = string | number | boolean | null | string[];
export type FrontMatter = Record<string, FrontMatterValue>;

const KEY_NAME = /^[A-Za-z_][\w-]*$/;

/** „klucz: wartość” → [klucz, wartość]; null, gdy linia nie jest parą. */
function keyValue(line: string): [string, string] | null {
  const colon = line.indexOf(":");
  if (colon <= 0) return null;
  const key = line.slice(0, colon);
  return KEY_NAME.test(key) ? [key, line.slice(colon + 1).trim()] : null;
}

/** „- element” → element; null, gdy linia nie jest elementem listy. */
function listItem(line: string): string | null {
  const t = line.trimStart();
  return t.startsWith("- ") ? t.slice(2).trim() : null;
}

export function stringifyFrontMatter(data: FrontMatter): string {
  const lines = Object.entries(data)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${lines.join("\n")}\n---\n`;
}

function parseScalar(raw: string): FrontMatterValue {
  const value = raw.trim();
  if (value === "") return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
    if (parsed === null || ["string", "number", "boolean"].includes(typeof parsed)) return parsed as FrontMatterValue;
  } catch {
    // Wartość wpisana ręcznie bez cudzysłowów.
  }
  return value.replace(/^'(.*)'$/, "$1");
}

/** Rozdziela nagłówek i treść. Brak nagłówka: pusty obiekt i cały tekst jako treść. */
export function parseFrontMatter(text: string): { data: FrontMatter; body: string } {
  const normalized = text.replaceAll("\r\n", "\n");
  if (!normalized.startsWith("---\n")) return { data: {}, body: normalized };
  const end = normalized.indexOf("\n---", 4);
  if (end === -1) return { data: {}, body: normalized };
  const data: FrontMatter = {};
  let listKey: string | null = null;
  for (const line of normalized.slice(4, end).split("\n")) {
    const item = listItem(line);
    if (item !== null && listKey) {
      const list = (data[listKey] as string[] | null) ?? [];
      list.push(String(parseScalar(item) ?? ""));
      data[listKey] = list;
      continue;
    }
    const pair = keyValue(line);
    if (!pair) continue;
    const value = parseScalar(pair[1]);
    data[pair[0]] = value;
    listKey = value === null ? pair[0] : null;
  }
  // Pomijamy resztę linii zamykającej i jedną pustą linię oddzielającą nagłówek od treści.
  const afterHeader = normalized
    .slice(end + 4)
    .replace(/^[^\n]*\n/, "")
    .replace(/^\n/, "");
  return { data, body: afterHeader };
}
