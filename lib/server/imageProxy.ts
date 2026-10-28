// lib/server/imageProxy.ts
//
// Pobieranie zdalnych obrazów z treści maili przez serwer (CSP aplikacji blokuje obce img-src,
// a proxy ukrywa adres IP użytkownika przed nadawcą). Ochrona przed SSRF: tylko http(s), domyślne porty,
// adresy publiczne (sprawdzane po rozwiązaniu DNS i po każdym przekierowaniu), bez SVG, limit rozmiaru.

import { BlockList, isIP } from "node:net";
import { lookup } from "node:dns/promises";

const PROXY_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif", "image/bmp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8_000;

const BLOCKED = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  BLOCKED.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["64:ff9b::", 96],
  ["2001:db8::", 32],
] as const) {
  BLOCKED.addSubnet(net, prefix, "ipv6");
}

/** Czy adres IP jest publiczny (nie prywatny, lokalny, zarezerwowany ani wielokrotny). */
export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !BLOCKED.check(address, "ipv4");
  if (family === 6) {
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
    if (mapped) return !BLOCKED.check(mapped[1], "ipv4");
    return !BLOCKED.check(address, "ipv6");
  }
  return false;
}

/** Wstępna walidacja adresu obrazu (bez DNS). */
export function parseImageUrl(raw: unknown): URL | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "80" && url.port !== "443") return null;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && !isPublicAddress(host)) return null;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    return null;
  }
  return url;
}

export type ResolveFn = (host: string) => Promise<string[]>;

const defaultResolve: ResolveFn = async (host) => (await lookup(host, { all: true })).map((a) => a.address);

/** Wszystkie adresy hosta muszą być publiczne. */
async function hostIsPublic(url: URL, resolve: ResolveFn = defaultResolve): Promise<boolean> {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return isPublicAddress(host);
  try {
    const addresses = await resolve(host);
    return addresses.length > 0 && addresses.every(isPublicAddress);
  } catch {
    return false;
  }
}

export type ProxyResult =
  { ok: true; contentType: string; body: Uint8Array } | { ok: false; status: number; reason: string };

export async function fetchRemoteImage(
  start: URL,
  deps: { fetchImpl?: typeof fetch; resolve?: ResolveFn } = {}
): Promise<ProxyResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!(await hostIsPublic(url, deps.resolve))) return { ok: false, status: 403, reason: "Adres niedozwolony." };
    const res = await fetchImpl(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "image/*" },
    });
    if (res.status >= 300 && res.status < 400) {
      const next = parseImageUrl(
        res.headers.get("location") ? new URL(res.headers.get("location") as string, url).toString() : ""
      );
      if (!next) return { ok: false, status: 403, reason: "Przekierowanie niedozwolone." };
      url = next;
      continue;
    }
    if (!res.ok || !res.body) return { ok: false, status: 502, reason: "Nie udało się pobrać obrazu." };
    const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!PROXY_IMAGE_TYPES.has(contentType)) return { ok: false, status: 415, reason: "Nieobsługiwany typ obrazu." };
    const declared = Number(res.headers.get("content-length") ?? "0");
    if (declared > MAX_IMAGE_BYTES) return { ok: false, status: 413, reason: "Obraz jest za duży." };

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_IMAGE_BYTES) {
        await reader.cancel();
        return { ok: false, status: 413, reason: "Obraz jest za duży." };
      }
      chunks.push(value);
    }
    const body = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      body.set(c, offset);
      offset += c.byteLength;
    }
    return { ok: true, contentType, body };
  }
  return { ok: false, status: 508, reason: "Za dużo przekierowań." };
}
