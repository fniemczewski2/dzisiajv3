// __tests__/lib/billSplit.test.ts

import { describe, it, expect } from "vitest";
import { BILL_SPLIT_SUBJECT, buildMailtoHref, formatBillSplit } from "@/lib/billSplit";

describe("formatBillSplit", () => {
  it("zawiera temat, sumę, udziały i procenty; bez dochodów", () => {
    const text = formatBillSplit({ total: 2000, share1: 1200, share2: 800 });
    expect(text).toBe(
      [BILL_SPLIT_SUBJECT, "Suma kosztów: 2000.00 zł", "Osoba 1: 1200.00 zł (60%)", "Osoba 2: 800.00 zł (40%)"].join(
        "\n"
      )
    );
    expect(text).not.toMatch(/netto|brutto|PIT|ZUS/i);
  });

  it("zero kosztów nie daje NaN w procentach", () => {
    const text = formatBillSplit({ total: 0, share1: 0, share2: 0 });
    expect(text).toContain("Osoba 1: 0.00 zł (0%)");
    expect(text).not.toContain("NaN");
  });

  it("zaokrągla kwoty do groszy", () => {
    expect(formatBillSplit({ total: 100, share1: 33.333, share2: 66.667 })).toContain("Osoba 2: 66.67 zł (67%)");
  });
});

describe("buildMailtoHref", () => {
  it("koduje temat i treść, także znaki nowej linii i polskie litery", () => {
    const href = buildMailtoHref("Podział kosztów", "Suma: 100.00 zł\nOsoba 1: 50 zł");
    expect(href.startsWith("mailto:?subject=")).toBe(true);
    const params = new URL(href).searchParams;
    expect(params.get("subject")).toBe("Podział kosztów");
    expect(params.get("body")).toBe("Suma: 100.00 zł\nOsoba 1: 50 zł");
  });
});
