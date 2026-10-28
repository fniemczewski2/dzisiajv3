// __tests__/lib/mail/addresses.test.ts

import { describe, it, expect } from "vitest";
import { extractAddress } from "@/lib/mail/addresses";

describe("extractAddress", () => {
  it("wyciąga adres z formatu „Imię <adres>”", () => {
    expect(extractAddress('"Anna K." <Anna@Example.com>')).toBe("anna@example.com");
  });
  it("przyjmuje goły adres", () => {
    expect(extractAddress("jan@x.pl")).toBe("jan@x.pl");
  });
  it("odrzuca wartości, które nie są adresem (np. wstrzyknięty nagłówek)", () => {
    expect(extractAddress("a@b.pl, Bcc: ofiara@z.pl")).toBeNull();
    expect(extractAddress("brak adresu")).toBeNull();
  });
});
