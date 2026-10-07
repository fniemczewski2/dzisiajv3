// lib/server/rateLimit.ts

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

const MAX_BUCKETS = 10_000;
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000 && buckets.size < MAX_BUCKETS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
  if (buckets.size > MAX_BUCKETS) {
    const overflow = buckets.size - MAX_BUCKETS;
    let i = 0;
    for (const key of buckets.keys()) {
      if (i++ >= overflow) break;
      buckets.delete(key);
    }
  }
}

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

/**
 * Adres klienta. Preferujemy nagłówki ustawiane przez platformę
 * (`x-vercel-forwarded-for`, `x-real-ip`) – pierwszy wpis `x-forwarded-for`
 * może zostać podany przez samego klienta i służyć do obchodzenia limitu.
 */
export function clientIp(req: { headers: Record<string, string | string[] | undefined> }): string {
  const first = (name: string) => {
    const raw = req.headers[name];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value?.split(",")[0]?.trim() || undefined;
  };
  const fwd = req.headers["x-forwarded-for"];
  const fwdValue = Array.isArray(fwd) ? fwd.join(",") : fwd;
  const lastForwarded = fwdValue?.split(",").map((s) => s.trim()).findLast(Boolean);

  return first("x-vercel-forwarded-for") ?? first("x-real-ip") ?? lastForwarded ?? "unknown";
}

/** Tylko do testów. */
export function __resetRateLimit() {
  buckets.clear();
  lastSweep = 0;
}
