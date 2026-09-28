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
    expect(clientIp({ headers: { "x-forwarded-for": "1.1.1.1, 9.9.9.9", "x-real-ip": "9.9.9.9" } })).toBe("9.9.9.9");
  });
  it("falls back to the proxy-appended (last) x-forwarded-for entry", () => {
    expect(clientIp({ headers: { "x-forwarded-for": "6.6.6.6, 2.2.2.2" } })).toBe("2.2.2.2");
  });
  it("returns unknown without headers", () => {
    expect(clientIp({ headers: {} })).toBe("unknown");
  });
});
