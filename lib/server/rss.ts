// lib/server/rss.ts
//
// Pobieranie i parsowanie kanałów RSS 2.0, RSS 1.0 (RDF) i Atom po stronie
// serwera. Wyniki trzymamy w pamięci 15 minut (błędy 5 minut), żeby nie
// odpytywać źródeł przy każdym wejściu na stronę.
//
// Własne kanały użytkownika przechodzą kontrolę SSRF: tylko http(s), standardowe
// porty i adresy publiczne (sprawdzane po rozwiązaniu DNS, także po przekierowaniu).

import { RSS_LIMITS, TIMEOUTS_MS, SERVER_TTL_MS } from "@/config/server";
import { XMLParser } from "fast-xml-parser";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export interface FeedItem {
  title: string;
  link: string;
  published: string | null;
  summary: string;
}

export interface FeedResult {
  items: FeedItem[];
  error: string | null;
}

const USER_AGENT = "Dzisiaj.fun RSS reader (+https://dzisiaj.fun)";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: true,
  htmlEntities: true,
  trimValues: true,
  // Bezpieczeństwo: żadnych encji zewnętrznych/DOCTYPE z treści kanału.
  allowBooleanAttributes: true,
});

const ENTITY: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/**
 * Usuwa bloki <script>/<style> razem z treścią. Wyszukiwanie przez indexOf
 * zamiast wyrażenia z leniwym `[\s\S]*?` – liniowo, bez ryzyka katastrofalnego
 * nawracania na złośliwie spreparowanym kanale.
 */
function removeBlocks(html: string, tag: string): string {
  const lower = html.toLowerCase();
  const open = `<${tag}`;
  const close = `</${tag}>`;
  let out = "";
  let pos = 0;
  for (;;) {
    const start = lower.indexOf(open, pos);
    if (start === -1) return out + html.slice(pos);
    const end = lower.indexOf(close, start);
    out += `${html.slice(pos, start)} `;
    if (end === -1) return out; // niedomknięty blok – reszta to jego treść
    pos = end + close.length;
  }
}

/** Zamienia znaczniki <…> na spacje – liniowo, bez regexu z nawracaniem. */
function removeTags(html: string): string {
  let out = "";
  let pos = 0;
  for (;;) {
    const start = html.indexOf("<", pos);
    if (start === -1) return out + html.slice(pos);
    const end = html.indexOf(">", start + 1);
    if (end === -1) return out + html.slice(pos);
    if (end === start + 1) {
      // Puste „<>” nie jest znacznikiem – zostaje w tekście (jak w poprzedniej wersji).
      out += html.slice(pos, end + 1);
    } else {
      out += `${html.slice(pos, start)} `;
    }
    pos = end + 1;
  }
}

export function stripHtml(html: string): string {
  return removeTags(removeBlocks(removeBlocks(html, "script"), "style"))
    .replaceAll(/&(#x[\da-f]{1,6}|#\d{1,7}|[a-z]{1,12});/gi, (m, code: string) => {
      if (code.startsWith("#x")) return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
      if (code.startsWith("#")) return String.fromCodePoint(Number(code.slice(1)));
      return ENTITY[code.toLowerCase()] ?? m;
    })
    .replaceAll(/\s+/g, " ")
    .trim();
}

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return text(value[0]);
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    return text(v["#text"] ?? v["__cdata"] ?? "");
  }
  return "";
}

function asArray<T>(v: T | T[] | null | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function atomLink(link: unknown): string {
  const links = asArray(link as Record<string, string> | Record<string, string>[]);
  const alt = links.find((l) => typeof l === "object" && (!l["@_rel"] || l["@_rel"] === "alternate"));
  if (alt && typeof alt === "object") return alt["@_href"] ?? "";
  return typeof link === "string" ? link : "";
}

function toIso(value: string): string | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function safeLink(link: string, base: string): string {
  if (!link.trim()) return ""; // pusty link rozwiązałby się do adresu kanału
  try {
    const url = new URL(link.trim(), base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

/** Węzeł elementu kanału z fast-xml-parser (pola zależne od formatu). */
type FeedItemNode = Record<string, unknown>;

/** Korzeń dokumentu RSS 2.0, Atom albo RSS 1.0 (RDF) – tylko pola, których używamy. */
interface FeedDocument {
  rss?: { channel?: { item?: FeedItemNode | FeedItemNode[] } };
  feed?: { entry?: FeedItemNode | FeedItemNode[] };
  "rdf:RDF"?: { item?: FeedItemNode | FeedItemNode[] };
}

/** Parsuje treść kanału. Rzuca błąd, gdy to nie jest RSS/Atom. */
export function parseFeed(xml: string, baseUrl: string): FeedItem[] {
  if (/<!ENTITY/i.test(xml)) throw new Error("Kanał zawiera niedozwolone deklaracje encji.");
  const doc = parser.parse(xml) as FeedDocument;

  let raw: FeedItemNode[] = [];
  let kind: "rss" | "atom" = "rss";
  if (doc.rss?.channel) raw = asArray(doc.rss.channel.item);
  else if (doc.feed) {
    raw = asArray(doc.feed.entry);
    kind = "atom";
  } else if (doc["rdf:RDF"]) raw = asArray(doc["rdf:RDF"].item);
  else throw new Error("To nie jest kanał RSS ani Atom.");

  return raw
    .slice(0, RSS_LIMITS.maxItemsPerFeed)
    .map((item) => {
      const link = kind === "atom" ? atomLink(item.link) : text(item.link) || text(item.guid);
      const published = toIso(text(item.pubDate ?? item.published ?? item.updated ?? item["dc:date"]));
      const summaryRaw = text(item.description ?? item.summary ?? item.content ?? item["content:encoded"]);
      return {
        title: stripHtml(text(item.title)).slice(0, 300) || "(bez tytułu)",
        link: safeLink(link, baseUrl),
        published,
        summary: stripHtml(summaryRaw).slice(0, 320),
      };
    })
    .filter((i) => i.link);
}

// --- SSRF ---------------------------------------------------------------------

function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) return isPrivateIPv4(ip);
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateIPv4(v6.slice(7));
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

/** Czy adres wolno pobrać jako własny kanał. Zwraca opis błędu albo null. */
export async function checkPublicUrl(raw: string): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "Nieprawidłowy adres.";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "Dozwolone są tylko adresy http(s).";
  if (url.username || url.password) return "Adres nie może zawierać loginu ani hasła.";
  if (url.port && url.port !== "80" && url.port !== "443") return "Niedozwolony port.";
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return "Niedozwolony adres.";
  try {
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    if (addresses.length === 0 || addresses.some((a) => isPrivateIp(a.address))) return "Niedozwolony adres.";
  } catch {
    return "Nie znaleziono serwera.";
  }
  return null;
}

async function fetchText(url: string, guard: boolean): Promise<string> {
  let current = url;
  for (let hop = 0; hop <= RSS_LIMITS.maxRedirects; hop++) {
    if (guard) {
      const problem = await checkPublicUrl(current);
      if (problem) throw new Error(problem);
    }
    const res = await fetch(current, {
      redirect: "manual",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
      },
      signal: AbortSignal.timeout(TIMEOUTS_MS.rss),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, current).toString();
      continue;
    }
    if (!res.ok) throw new Error(`Serwer odpowiedział kodem ${res.status}.`);
    const length = Number(res.headers.get("content-length") ?? 0);
    if (length > RSS_LIMITS.maxBytes) throw new Error("Kanał jest za duży.");
    const body = await res.text();
    if (body.length > RSS_LIMITS.maxBytes) throw new Error("Kanał jest za duży.");
    return body;
  }
  throw new Error("Za dużo przekierowań.");
}

const cache = new Map<string, { at: number; result: FeedResult }>();

/** Pobiera kanał z pamięcią podręczną. `guard` – kontrola SSRF dla adresów użytkownika. */
export async function getFeed(url: string, guard: boolean): Promise<FeedResult> {
  const hit = cache.get(url);
  const now = Date.now();
  if (hit && now - hit.at < (hit.result.error ? SERVER_TTL_MS.rssError : SERVER_TTL_MS.rssOk)) return hit.result;

  let result: FeedResult;
  try {
    result = { items: parseFeed(await fetchText(url, guard), url), error: null };
  } catch (err) {
    const message =
      err instanceof Error && err.name !== "TimeoutError" ? err.message : "Przekroczono czas oczekiwania.";
    result = { items: hit?.result.items ?? [], error: message };
  }
  if (cache.size > 500) cache.clear();
  cache.set(url, { at: now, result });
  return result;
}
