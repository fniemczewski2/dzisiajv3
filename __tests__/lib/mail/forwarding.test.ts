// __tests__/lib/mail/forwarding.test.ts

import { describe, it, expect } from "vitest";
import {
  createForwardingToken,
  forwardingAddress,
  hashForwardingToken,
  tokenFromRecipient,
} from "@/lib/mail/forwarding";

const DOMAIN = "poczta.dzisiaj.fun";

describe("adresy przekierowania", () => {
  it("token jest 32-znakowym hexem i jest losowy", () => {
    const a = createForwardingToken();
    const b = createForwardingToken();
    expect(a).toMatch(/^[a-f0-9]{32}$/);
    expect(a).not.toBe(b);
  });

  it("z adresu odzyskuje się token", () => {
    const token = "0123456789abcdef0123456789abcdef";
    expect(tokenFromRecipient(forwardingAddress(token, DOMAIN), DOMAIN)).toBe(token);
  });

  it("adres z inną domeną albo złym formatem nie daje tokenu", () => {
    const token = "0123456789abcdef0123456789abcdef";
    expect(tokenFromRecipient(`p-${token}@evil.example`, DOMAIN)).toBeNull();
    expect(tokenFromRecipient(`p-${token}x@${DOMAIN}`, DOMAIN)).toBeNull();
    expect(tokenFromRecipient(`x-${token}@${DOMAIN}`, DOMAIN)).toBeNull();
  });

  it("skrót tokenu jest deterministyczny i nie równa się tokenowi", async () => {
    const token = "0123456789abcdef0123456789abcdef";
    const h1 = await hashForwardingToken(token);
    expect(h1).toBe(await hashForwardingToken(token));
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
    expect(h1).not.toContain(token);
  });
});
