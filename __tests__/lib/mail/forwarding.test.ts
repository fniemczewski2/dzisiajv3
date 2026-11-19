// __tests__/lib/mail/forwarding.test.ts

import { describe, it, expect } from "vitest";
import {
  createForwardingToken,
  forwardingAddress,
  hashForwardingToken,
  parseForwardingRecipient,
  isForwardingConfirmation,
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
    expect(parseForwardingRecipient(forwardingAddress(token, DOMAIN), DOMAIN)).toEqual({ kind: "mail", token });
    expect(parseForwardingRecipient(forwardingAddress(token, DOMAIN, "tickets"), DOMAIN)).toEqual({
      kind: "tickets",
      token,
    });
  });

  it("adres z inną domeną albo złym formatem nie daje tokenu", () => {
    const token = "0123456789abcdef0123456789abcdef";
    expect(parseForwardingRecipient(`p-${token}@evil.example`, DOMAIN)).toBeNull();
    expect(parseForwardingRecipient(`p-${token}x@${DOMAIN}`, DOMAIN)).toBeNull();
    expect(parseForwardingRecipient(`x-${token}@${DOMAIN}`, DOMAIN)).toBeNull();
  });

  it("skrót tokenu jest deterministyczny i nie równa się tokenowi", async () => {
    const token = "0123456789abcdef0123456789abcdef";
    const h1 = await hashForwardingToken(token);
    expect(h1).toBe(await hashForwardingToken(token));
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
    expect(h1).not.toContain(token);
  });
});

describe("isForwardingConfirmation", () => {
  it("rozpoznaje mail weryfikacyjny przekazywania Gmaila", () => {
    expect(
      isForwardingConfirmation({ from: "forwarding-noreply@google.com", subject: "(#1) Gmail Forwarding Confirmation" })
    ).toBe(true);
    expect(isForwardingConfirmation({ from: "x@y.pl", subject: "Potwierdzenie przekazywania w Gmailu" })).toBe(true);
    expect(isForwardingConfirmation({ from: "bilet@intercity.pl", subject: "Bilet PKP Intercity" })).toBe(false);
  });
});
