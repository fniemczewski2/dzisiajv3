// __tests__/lib/server/rateLimit.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, clientIp, __resetRateLimit } from "@/lib/server/rateLimit";

beforeEach(() => __resetRateLimit());

describe("checkRateLimit", () => {
  it("allows up to the limit and blocks afterwards", () => {
    expect(checkRateLimit("k", 2, 60_000)).toBe(true);
    expect(checkRateLimit("k", 2, 60_000)).toBe(true);
    expect(checkRateLimit("k", 2, 60_000)).toBe(false);
  });
});

describe("clientIp", () => {
  it("prefers platform headers over a client-controlled x-forwarded-for", () => {
    expect(clientIp({ headers: { "x-forwarded-for": "192.0.2.1, 198.51.100.9", "x-real-ip": "198.51.100.9" } })).toBe("198.51.100.9");
  });
  it("falls back to the proxy-appended (last) x-forwarded-for entry", () => {
    expect(clientIp({ headers: { "x-forwarded-for": "203.0.113.6, 198.51.100.2" } })).toBe("198.51.100.2");
  });
  it("returns unknown without headers", () => {
    expect(clientIp({ headers: {} })).toBe("unknown");
  });
});
