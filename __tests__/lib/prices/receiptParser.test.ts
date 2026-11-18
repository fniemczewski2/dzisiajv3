// __tests__/lib/prices/receiptParser.test.ts

import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { displayNameOf, parseReceiptText } from "@/lib/prices/receiptParser";

const fixture = (name: string) => readFileSync(`__tests__/fixtures/receipts/${name}.txt`, "utf8");

const LIDL = [
  "lidl-2026-09-12",
  "lidl-2026-10-05",
  "lidl-2026-10-15",
  "lidl-2026-10-19",
  "lidl-2026-10-23",
  "lidl-2026-10-31",
  "lidl-2026-11-10",
  "lidl-2026-11-13",
  "lidl-2026-11-17",
];

describe("parseReceiptText: Lidl (tekst z OCR)", () => {
  // Dwa paragony mają za dużo błędów OCR w rabatach, żeby suma się domknęła (zob. test poniżej).
  const RECONCILING = LIDL.filter((name) => !["lidl-2026-09-12", "lidl-2026-10-15"].includes(name));

  it.each(RECONCILING)("%s: pozycje sumują się do Suma PLN", (name) => {
    const receipt = parseReceiptText(fixture(name));
    expect(receipt?.store).toBe("lidl");
    expect(receipt?.items.length).toBeGreaterThan(5);
    expect(receipt?.total).not.toBeNull();
    expect(receipt?.totalMismatch).toBe(false);
  });

  it.each(["lidl-2026-09-12", "lidl-2026-10-15"])(
    "%s: błędy OCR w rabatach zostawiają ostrzeżenie o niezgodnej sumie",
    (name) => {
      const receipt = parseReceiptText(fixture(name))!;
      expect(receipt.total).not.toBeNull();
      expect(receipt.totalMismatch).toBe(true);
    }
  );

  it("rabat większy od wartości pozycji jest oznaczony do weryfikacji", () => {
    const text = ["Lidl", "2026-10-01", "Ser", "1 * 5.00 5.00 C", "Rabat grupowy -8,69", "Suma PLN 5,00"].join("\n");
    expect(parseReceiptText(text)!.items[0].issues).toContain("discount");
  });

  it("rabat odejmuje się od wartości pozycji (Gouda 2 × 9,99, Taniej za 2 −10,00)", () => {
    const receipt = parseReceiptText(fixture("lidl-2026-10-19"))!;
    const gouda = receipt.items.find((i) => i.rawName.startsWith("Gouda"))!;
    expect(gouda).toMatchObject({ quantity: 2, unitPrice: 9.99, lineValue: 19.98, discount: 10, netValue: 9.98 });
  });

  it("pozycja ważona: waga × cena za kg", () => {
    const receipt = parseReceiptText(fixture("lidl-2026-10-19"))!;
    const marchew = receipt.items.find((i) => i.rawName.startsWith("Marchew luz"))!;
    expect(marchew).toMatchObject({ weighed: true, quantity: 0.374, unitPrice: 3.99, lineValue: 1.49 });
  });

  it("odczytuje datę i sklep", () => {
    expect(parseReceiptText(fixture("lidl-2026-10-15"))).toMatchObject({ store: "lidl", date: "2026-10-15" });
  });
});

describe("parseReceiptText: Biedronka", () => {
  it("paragon fiskalny: opusty i suma", () => {
    const receipt = parseReceiptText(fixture("biedronka-2026-10-30"))!;
    expect(receipt.store).toBe("biedronka");
    expect(receipt.date).toBe("2026-10-30");
    expect(receipt.total).toBe(56.9);
    expect(receipt.totalMismatch).toBe(false);
    const mascarpone = receipt.items.find((i) => /Mascarpone/.test(i.rawName))!;
    expect(mascarpone).toMatchObject({ quantity: 2, unitPrice: 6.99, discount: 3, netValue: 10.98 });
  });

  it("pozycja na wagę (1,050 × 12,99) z opustem", () => {
    const receipt = parseReceiptText(fixture("biedronka-2026-09-16"))!;
    const pomidory = receipt.items.find((i) => /Pom malin/.test(i.rawName))!;
    expect(pomidory).toMatchObject({ weighed: true, quantity: 1.05, discount: 5.25, netValue: 8.39 });
    expect(receipt.totalMismatch).toBe(false);
  });

  it("paragon niefiskalny na dwóch stronach (pozycje i suma osobno)", () => {
    const receipt = parseReceiptText(`${fixture("biedronka-2026-04-16-a")}\n${fixture("biedronka-2026-04-16-b")}`)!;
    expect(receipt.total).toBe(134.92);
    expect(receipt.date).toBe("2026-04-16");
    expect(receipt.items.every((i) => !i.weighed)).toBe(true);
  });
});

describe("parseReceiptText: odporność na błędy OCR", () => {
  it("naprawia cenę jednostkową, gdy wartość pozycji zgadza się z sumą", () => {
    const text = ["Lidl", "2026-10-01", "Ser", "2 * 9.99 19.98 C", "Suma PLN 19,98"].join("\n").replace("9.99", "9.88");
    const receipt = parseReceiptText(text)!;
    expect(receipt.items[0]).toMatchObject({ unitPrice: 9.99, issues: ["corrected"] });
    expect(receipt.totalMismatch).toBe(false);
  });

  it("naprawia wartość pozycji, gdy cena i ilość zgadzają się z sumą", () => {
    const text = ["Lidl", "2026-10-01", "Ser", "2 * 9.99 18.98 C", "Suma PLN 19,98"].join("\n");
    const receipt = parseReceiptText(text)!;
    expect(receipt.items[0]).toMatchObject({ lineValue: 19.98, issues: ["corrected"] });
  });

  it("zostawia oznaczenie arithmetic, gdy suma nie rozstrzyga", () => {
    const text = ["Lidl", "2026-10-01", "Ser", "2 * 9.99 18.98 C", "Suma PLN 25,00"].join("\n");
    expect(parseReceiptText(text)!.items[0].issues).toEqual(["arithmetic"]);
  });

  it("odczytuje wagę z „@” zamiast zera", () => {
    const text = ["Lidl", "2026-10-01", "Ogorki luz", "@,400kg x 7.99 3.2 C", "Suma PLN 3,20"].join("\n");
    expect(parseReceiptText(text)!.items[0]).toMatchObject({ weighed: true, quantity: 0.4, lineValue: 3.2 });
  });

  it("nieznany sklep daje null", () => {
    expect(parseReceiptText("Żabka\n1 * 2.00 2.00 A\nSuma PLN 2,00")).toBeNull();
  });
});

describe("displayNameOf", () => {
  it("rozdziela sklejone słowa i cyfry", () => {
    expect(displayNameOf("PrzypPaprKamis16-20g")).toBe("Przyp Papr Kamis 16-20g");
    expect(displayNameOf("Pomidory malin.PL500")).toBe("Pomidory malin.PL 500");
  });
});
