// lib/server/imageProxy.ts
//
// Pobieranie zdalnych obrazów z treści maili przez serwer (CSP aplikacji blokuje obce img-src,
// a proxy ukrywa adres IP użytkownika przed nadawcą). Ochrona przed SSRF: tylko http(s), domyślne porty,
// adresy publiczne (sprawdzane po rozwiązaniu DNS i po każdym przekierowaniu), bez SVG, limit rozmiaru.

import { IMAGE_PROXY_MAX_BYTES, IMAGE_PROXY_MAX_REDIRECTS, IMAGE_PROXY_TIMEOUT_MS } from "@/config/server";
import { BlockList, isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { LookupFunction } from "node:net";
import { Readable } from "node:stream";

const PROXY_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif", "image/bmp"]);

const BLOCKED = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8], // NOSONAR – zakres blokowany (ochrona przed SSRF), nie adres docelowy
  ["10.0.0.0", 8], // NOSONAR – zakres blokowany (ochrona przed SSRF), nie adres docelowy
  ["100.64.0.0", 10], // NOSONAR – zakres blokowany (ochrona przed SSRF), nie adres docelowy
  ["127.0.0.0", 8], // NOSONAR – zakres blokowany (ochrona przed SSRF), nie adres docelowy
  ["169.254.0.0", 16], // NOSONAR – zakres blokowany (ochrona przed SSRF), nie adres docelowy
  ["172.16.0.0", 12], // NOSONAR – zakres blokowany (ochrona przed SSRF), nie adres docelowy
  ["192.0.0.0", 24], // NOSONAR – zakres blokowany (ochrona przed SSRF), nie adres docelowy
  ["192.0.2.0", 24], // NOSONAR – zakres blokowany (ochrona przed SSRF), nie adres docelowy
  ["192.168.0.0", 16], // NOSONAR – zakres blokowany (ochrona przed SSRF), nie adres docelowy
  ["198.18.0.0", 15], // NOSONAR – zakres blokowany (ochrona przed SSRF), nie adres docelowy
  ["198.51.100.0", 24], // NOSONAR – zakres blokowany (ochrona przed SSRF), nie adres docelowy
  ["203.0.113.0", 24], // NOSONAR – zakres blokowany (ochrona przed SSRF), nie adres docelowy
  ["224.0.0.0", 4], // NOSONAR – zakres blokowany (ochrona przed SSRF), nie adres docelowy
  ["240.0.0.0", 4], // NOSONAR – zakres blokowany (ochrona przed SSRF), nie adres docelowy
] as const) {
  BLOCKED.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 128], // NOSONAR – zakres blokowany (ochrona przed SSRF), nie adres docelowy
  ["::1", 128], // NOSONAR – zakres blokowany (ochrona przed SSRF), nie adres docelowy
  ["fc00::", 7], // NOSONAR – zakres blokowany (ochrona przed SSRF), nie adres docelowy
  ["fe80::", 10], // NOSONAR – zakres blokowany (ochrona przed SSRF), nie adres docelowy
  ["ff00::", 8], // NOSONAR – zakres blokowany (ochrona przed SSRF), nie adres docelowy
  ["64:ff9b::", 96], // NOSONAR – zakres blokowany (ochrona przed SSRF), nie adres docelowy
  ["2001:db8::", 32], // NOSONAR – zakres blokowany (ochrona przed SSRF), nie adres docelowy
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

export interface ResolvedHost {
  address: string;
  family: 4 | 6;
}

/**
 * Wszystkie adresy hosta muszą być publiczne; zwraca pierwszy z nich – połączenie idzie dokładnie pod ten adres
 * (ochrona przed DNS rebinding: brak drugiego zapytania DNS między sprawdzeniem a połączeniem).
 */
export async function resolvePublicHost(url: URL, resolve: ResolveFn = defaultResolve): Promise<ResolvedHost | null> {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return isPublicAddress(host) ? { address: host, family: isIP(host) as 4 | 6 } : null;
  try {
    const addresses = await resolve(host);
    if (addresses.length === 0 || !addresses.every(isPublicAddress)) return null;
    return { address: addresses[0], family: isIP(addresses[0]) as 4 | 6 };
  } catch {
    return null;
  }
}

/** lookup dla node:http(s), który zawsze zwraca sprawdzony wcześniej adres (TLS i SNI nadal po nazwie hosta). */
export function pinnedLookup(target: ResolvedHost): LookupFunction {
  return ((_hostname: string, options: { all?: boolean }, callback: (...args: unknown[]) => void) => {
    if (options?.all) callback(null, [{ address: target.address, family: target.family }]);
    else callback(null, target.address, target.family);
  }) as unknown as LookupFunction;
}

const NO_BODY_STATUS = new Set([101, 204, 205, 304]);

/** GET bez przekierowań, z połączeniem pod przypięty adres IP. */
function pinnedGet(url: URL, target: ResolvedHost, signal: AbortSignal): Promise<Response> {
  return new Promise((resolve, reject) => {
    const request = url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = request(
      url,
      { method: "GET", headers: { Accept: "image/*" }, signal, lookup: pinnedLookup(target) },
      (res) => {
        const headers = new Headers();
        for (const [name, value] of Object.entries(res.headers)) {
          if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
        }
        const status = res.statusCode ?? 502;
        const body = NO_BODY_STATUS.has(status) ? null : (Readable.toWeb(res) as ReadableStream<Uint8Array>);
        resolve(new Response(body, { status, headers }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

export type ProxyResult =
  { ok: true; contentType: string; body: Uint8Array } | { ok: false; status: number; reason: string };

export async function fetchRemoteImage(
  start: URL,
  deps: { fetchImpl?: typeof fetch; resolve?: ResolveFn } = {}
): Promise<ProxyResult> {
  let url = start;
  for (let hop = 0; hop <= IMAGE_PROXY_MAX_REDIRECTS; hop++) {
    const target = await resolvePublicHost(url, deps.resolve);
    if (!target) return { ok: false, status: 403, reason: "Adres niedozwolony." };
    const res = await requestImage(url, target, deps.fetchImpl);
    if (res.status >= 300 && res.status < 400) {
      const next = redirectTarget(res, url);
      if (!next) return { ok: false, status: 403, reason: "Przekierowanie niedozwolone." };
      url = next;
      continue;
    }
    return readImage(res);
  }
  return { ok: false, status: 508, reason: "Za dużo przekierowań." };
}

function requestImage(url: URL, target: ResolvedHost, fetchImpl?: typeof fetch): Promise<Response> {
  const signal = AbortSignal.timeout(IMAGE_PROXY_TIMEOUT_MS);
  return fetchImpl
    ? fetchImpl(url, { redirect: "manual", signal, headers: { Accept: "image/*" } })
    : pinnedGet(url, target, signal);
}

/** Cel przekierowania po tej samej walidacji co adres początkowy; null – niedozwolony. */
function redirectTarget(res: Response, base: URL): URL | null {
  const location = res.headers.get("location");
  return location ? parseImageUrl(new URL(location, base).toString()) : null;
}

/** Typ z listy dozwolonych i rozmiar w limicie (sprawdzany także podczas czytania strumienia). */
async function readImage(res: Response): Promise<ProxyResult> {
  if (!res.ok || !res.body) return { ok: false, status: 502, reason: "Nie udało się pobrać obrazu." };
  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!PROXY_IMAGE_TYPES.has(contentType)) return { ok: false, status: 415, reason: "Nieobsługiwany typ obrazu." };
  if (Number(res.headers.get("content-length") ?? "0") > IMAGE_PROXY_MAX_BYTES) {
    return { ok: false, status: 413, reason: "Obraz jest za duży." };
  }
  const body = await readLimited(res.body, IMAGE_PROXY_MAX_BYTES);
  return body ? { ok: true, contentType, body } : { ok: false, status: 413, reason: "Obraz jest za duży." };
}

async function readLimited(stream: ReadableStream<Uint8Array>, limit: number): Promise<Uint8Array | null> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}
