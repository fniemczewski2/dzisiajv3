// __tests__/lib/mail/reply.test.ts

import { describe, it, expect } from "vitest";
import { buildReplyMime, encodeHeaderValue, toBase64Url, utf8ToBase64 } from "@/lib/mail/reply";

describe("buildReplyMime", () => {
  it("dodaje prefiks Re: tylko raz", () => {
    const mime = buildReplyMime({ from: "ja@x.pl", to: "ona@y.pl", subject: "Faktura", body: "ok" });
    expect(mime).toContain("Subject: Re: Faktura");
    const twice = buildReplyMime({ from: "ja@x.pl", to: "ona@y.pl", subject: "Re: Faktura", body: "ok" });
    expect(twice).toContain("Subject: Re: Faktura");
  });

  it("wiąże odpowiedź z wątkiem nagłówkami In-Reply-To i References", () => {
    const mime = buildReplyMime({
      from: "ja@x.pl",
      to: "ona@y.pl",
      subject: "Temat",
      body: "ok",
      inReplyTo: "<m2@y.pl>",
      references: "<m1@y.pl>",
    });
    expect(mime).toContain("In-Reply-To: <m2@y.pl>");
    expect(mime).toContain("References: <m1@y.pl> <m2@y.pl>");
  });

  it("treść jest zakodowana base64 i odkodowuje się do oryginału", () => {
    const body = "Dzień dobry, potwierdzam termin.";
    const mime = buildReplyMime({ from: "a@x.pl", to: "b@y.pl", subject: "t", body });
    const encoded = mime.split("\r\n\r\n")[1].replace(/\r\n/g, "");
    expect(Buffer.from(encoded, "base64").toString("utf8")).toBe(body);
  });

  it("odrzuca znaki nowej linii w nagłówkach (wstrzykiwanie nagłówków)", () => {
    expect(() => buildReplyMime({ from: "a@x.pl", to: "b@y.pl\r\nBcc: ofiara@z.pl", subject: "t", body: "x" })).toThrow(
      /nagłówku/
    );
  });
});

describe("kodowanie", () => {
  it("polskie znaki w temacie są kodowane RFC 2047", () => {
    const value = encodeHeaderValue("Zażółć");
    expect(value.startsWith("=?UTF-8?B?")).toBe(true);
    const payload = value.slice("=?UTF-8?B?".length, -2);
    expect(Buffer.from(payload, "base64").toString("utf8")).toBe("Zażółć");
  });
  it("ASCII pozostaje bez zmian", () => {
    expect(encodeHeaderValue("Hello")).toBe("Hello");
  });
  it("base64url nie zawiera +, / ani paddingu", () => {
    const out = toBase64Url("??>>~~");
    expect(out).not.toMatch(/[+/=]/);
    expect(utf8ToBase64("a")).toBe("YQ==");
  });
});
