// lib/server/rateLimit.ts
//
// Limit zapytań. W produkcji liczniki trzyma Upstash Redis (wspólne dla
// wszystkich instancji serverless). Bez UPSTASH_REDIS_REST_URL/TOKEN limiter
// działa w pamięci procesu – wystarcza lokalnie i w testach, ale na Vercelu
// każda instancja liczy osobno.

import type { NextApiRequest, NextApiResponse } from "next";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { serverEnv } from "@/config/env";
import {
  RATE_LIMITS,
  RATE_LIMIT_MEMORY_MAX_KEYS,
  RATE_LIMIT_REDIS_TIMEOUT_MS,
  type RateLimitName,
  type RateLimitWindow,
} from "@/config/server";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000 && buckets.size < RATE_LIMIT_MEMORY_MAX_KEYS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
  if (buckets.size > RATE_LIMIT_MEMORY_MAX_KEYS) {
    const overflow = buckets.size - RATE_LIMIT_MEMORY_MAX_KEYS;
    let i = 0;
    for (const key of buckets.keys()) {
      if (i++ >= overflow) break;
      buckets.delete(key);
    }
  }
}

/** Limiter w pamięci procesu (okno stałe). Zwraca `true`, gdy żądanie mieści się w limicie. */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

function windowToMs(window: RateLimitWindow): number {
  const [amount, unit] = window.split(" ");
  const value = Number(amount);
  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60_000;
    case "h":
      return value * 3_600_000;
    default:
      throw new Error(`Nieznana jednostka okna limitu: ${window}`);
  }
}

let redis: Redis | null | undefined;
const limiters = new Map<RateLimitName, Ratelimit>();

function redisClient(): Redis | null {
  if (redis !== undefined) return redis;
  const url = serverEnv.upstash.url;
  const token = serverEnv.upstash.token;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

function upstashLimiter(name: RateLimitName): Ratelimit | null {
  const client = redisClient();
  if (!client) return null;
  let limiter = limiters.get(name);
  if (!limiter) {
    const rule = RATE_LIMITS[name];
    limiter = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(rule.limit, rule.window),
      prefix: `dzisiaj:rl:${name}`,
      timeout: RATE_LIMIT_REDIS_TIMEOUT_MS,
      analytics: false,
    });
    limiters.set(name, limiter);
  }
  return limiter;
}

export interface RateLimitResult {
  ok: boolean;
  /** Sekundy do ponowienia (nagłówek Retry-After). */
  retryAfter: number;
}

/** Sprawdza limit `name` dla klucza (IP, id użytkownika, token…). */
async function rateLimit(name: RateLimitName, key: string): Promise<RateLimitResult> {
  const rule = RATE_LIMITS[name];
  const windowMs = windowToMs(rule.window);
  const limiter = upstashLimiter(name);

  if (limiter) {
    try {
      const { success, reset } = await limiter.limit(key);
      return { ok: success, retryAfter: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
    } catch (error) {
      console.error("[rateLimit] Upstash niedostępny, używam limitera w pamięci:", error);
    }
  }

  const ok = checkRateLimit(`${name}:${key}`, rule.limit, windowMs);
  return { ok, retryAfter: Math.ceil(windowMs / 1000) };
}

/**
 * Wariant dla endpointów: przy przekroczeniu limitu ustawia 429 i Retry-After
 * i zwraca `false` – handler powinien wtedy zakończyć pracę.
 */
export async function enforceRateLimit(
  res: NextApiResponse,
  name: RateLimitName,
  key: string,
  message = "Zbyt wiele żądań. Spróbuj ponownie za chwilę."
): Promise<boolean> {
  const { ok, retryAfter } = await rateLimit(name, key);
  if (ok) return true;
  res.setHeader("Retry-After", String(retryAfter));
  res.status(429).json({ error: message });
  return false;
}

/**
 * Adres klienta. Preferujemy nagłówki ustawiane przez platformę
 * (`x-vercel-forwarded-for`, `x-real-ip`) – pierwszy wpis `x-forwarded-for`
 * może zostać podany przez samego klienta i służyć do obchodzenia limitu.
 */
export function clientIp(req: Pick<NextApiRequest, "headers">): string {
  const first = (name: string) => {
    const raw = req.headers[name];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value?.split(",")[0]?.trim() || undefined;
  };
  const fwd = req.headers["x-forwarded-for"];
  const fwdValue = Array.isArray(fwd) ? fwd.join(",") : fwd;
  const lastForwarded = fwdValue
    ?.split(",")
    .map((s) => s.trim())
    .findLast(Boolean);

  return first("x-vercel-forwarded-for") ?? first("x-real-ip") ?? lastForwarded ?? "unknown";
}

/** Tylko do testów. */
export function __resetRateLimit() {
  buckets.clear();
  lastSweep = 0;
  limiters.clear();
  redis = undefined;
}
