// lib/obsidian/frontMatter.ts
//
// Minimalny nagłówek YAML (front matter) dla Obsidiana. Zapisujemy wartości w składni zgodnej z JSON
// (cudzysłowy, listy w nawiasach) – to poprawny YAML. Odczyt toleruje też ręczne edycje w Obsidianie:
// wartości bez cudzysłowów i listy blokowe („- element”).

export type FrontMatterValue = string | number | boolean | null | string[];
export type FrontMatter = Record<string, FrontMatterValue>;

const KEY_RE = /^([A-Za-z_][\w-]*):\s*(.*)$/;

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
    const item = /^\s*-\s+(.*)$/.exec(line);
    if (item && listKey) {
      const list = (data[listKey] as string[] | null) ?? [];
      list.push(String(parseScalar(item[1]) ?? ""));
      data[listKey] = list;
      continue;
    }
    const m = KEY_RE.exec(line);
    if (!m) continue;
    const value = parseScalar(m[2]);
    data[m[1]] = value;
    listKey = value === null ? m[1] : null;
  }
  // Pomijamy resztę linii zamykającej i jedną pustą linię oddzielającą nagłówek od treści.
  const afterHeader = normalized
    .slice(end + 4)
    .replace(/^[^\n]*\n/, "")
    .replace(/^\n/, "");
  return { data, body: afterHeader };
}
