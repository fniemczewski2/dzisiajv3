// lib/mentions.ts
//
// Powiązania encji w treści: @Osoba, !Zadanie, $Rachunek. Nazwa zaczyna się literą, spacje zapisuje się jako „_”
// („!Kupić_bilety” → zadanie „Kupić bilety”). Znak nie może stać bezpośrednio po literze lub cyfrze, więc adres
// e-mail (jan@x.pl), kwota ($100) i osadzenie Obsidiana (![[…]]) nie są powiązaniem.
// Eksport do Obsidiana zamienia znacznik na [[Nazwa]], a listę rodzajów zapisuje w nagłówku (dzisiaj_links) –
// import odtwarza z niej znacznik.

export type MentionKind = "person" | "task" | "bill";

const MENTION_SIGILS: Readonly<Record<string, MentionKind>> = { "@": "person", "!": "task", $: "bill" };

const SIGIL_OF: Readonly<Record<MentionKind, string>> = { person: "@", task: "!", bill: "$" };

/** Etykieta rodzaju: tag Obsidiana i prefiks w dzisiaj_links. */
const MENTION_TAGS: Readonly<Record<MentionKind, string>> = {
  person: "osoba",
  task: "zadanie",
  bill: "rachunek",
};

const MENTION_RE = /(?<![\p{L}\p{N}_])([@!$])(\p{L}[\p{L}\p{N}_-]*)/gu;

export interface Mention {
  kind: MentionKind;
  /** Nazwa ze spacjami („Kupić bilety”). */
  name: string;
  /** Tekst w treści („!Kupić_bilety”). */
  raw: string;
  index: number;
}

/** Myślnik lub podkreślenie na końcu to interpunkcja, nie część nazwy. */
function trimName(token: string): string {
  return token.replace(/[-_]+$/u, "");
}

function nameFromToken(token: string): string {
  return trimName(token).replaceAll("_", " ");
}

function tokenFromName(name: string): string {
  return name.trim().replaceAll(/\s+/g, "_");
}

export function findMentions(text: string): Mention[] {
  if (!text) return [];
  const out: Mention[] = [];
  for (const m of text.matchAll(MENTION_RE)) {
    const token = trimName(m[2]);
    if (!token) continue;
    out.push({ kind: MENTION_SIGILS[m[1]], name: nameFromToken(token), raw: `${m[1]}${token}`, index: m.index ?? 0 });
  }
  return out;
}

export type MentionPart = { type: "text"; text: string } | { type: "mention"; mention: Mention };

/** Podział tekstu na zwykły tekst i powiązania (do renderowania). */
export function splitMentions(text: string): MentionPart[] {
  const parts: MentionPart[] = [];
  let last = 0;
  for (const mention of findMentions(text)) {
    if (mention.index > last) parts.push({ type: "text", text: text.slice(last, mention.index) });
    parts.push({ type: "mention", mention });
    last = mention.index + mention.raw.length;
  }
  if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
  return parts;
}

/** Znaki niedozwolone w nazwie linku Obsidiana. */
const WIKILINK_FORBIDDEN = /[[\]|#^]/g;

export interface ObsidianLinks {
  text: string;
  /** „rodzaj:Nazwa” – do odtworzenia znaczników przy imporcie. */
  links: string[];
  /** Rodzaje powiązań obecne w tekście (osoba, zadanie, rachunek). */
  tags: string[];
}

/** „Spotkanie z @Jan_Kowalski” → „Spotkanie z [[Jan Kowalski]]”. */
export function toObsidianLinks(text: string): ObsidianLinks {
  const links = new Set<string>();
  const tags = new Set<string>();
  const out = splitMentions(text)
    .map((part) => {
      if (part.type === "text") return part.text;
      const name = part.mention.name.replace(WIKILINK_FORBIDDEN, " ").trim();
      links.add(`${MENTION_TAGS[part.mention.kind]}:${name}`);
      tags.add(MENTION_TAGS[part.mention.kind]);
      return `[[${name}]]`;
    })
    .join("");
  return { text: out, links: [...links], tags: [...tags] };
}

const KIND_BY_TAG: Readonly<Record<string, MentionKind>> = { osoba: "person", zadanie: "task", rachunek: "bill" };

/** Odwrotność toObsidianLinks: [[Nazwa]] wymieniona w `links` wraca do znacznika; pozostałe linki zostają. */
export function fromObsidianLinks(text: string, links: readonly string[]): string {
  const kindByName = new Map<string, MentionKind>();
  for (const entry of links) {
    const colon = entry.indexOf(":");
    if (colon <= 0) continue;
    const kind = KIND_BY_TAG[entry.slice(0, colon)];
    if (kind) kindByName.set(entry.slice(colon + 1), kind);
  }
  if (kindByName.size === 0) return text;
  return text.replaceAll(/\[\[([^\]|#^]+)\]\]/g, (whole, name: string) => {
    const kind = kindByName.get(name.trim());
    return kind ? `${SIGIL_OF[kind]}${tokenFromName(name)}` : whole;
  });
}

/** Tag Obsidiana: bez spacji i znaków specjalnych, nie same cyfry. */
export function obsidianTag(value: string | null | undefined): string | null {
  if (!value) return null;
  const tag = value
    .trim()
    .toLocaleLowerCase("pl")
    .replaceAll(/\s+/g, "-")
    .replaceAll(/[^\p{L}\p{N}_/-]/gu, "")
    .replaceAll(/^[-/]+|[-/]+$/g, "");
  if (!tag || /^\d+$/.test(tag)) return null;
  return tag.slice(0, 60);
}
