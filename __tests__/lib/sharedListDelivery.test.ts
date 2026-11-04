// __tests__/lib/sharedListDelivery.test.ts
//
// Powiadomienia o zmianach listy wysyłane tylko do odbiorców, którzy mają ten rodzaj włączony.
// Dodatkowo strażnik kolejności: w notify-shared zapis do `notifications` i wysyłka push są po sprawdzeniu preferencji.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isRecipientEnabled, planListDelivery } from "../../supabase/functions/_shared/sharedNotifyRules";

const ONE = { added: 1, removed: 0, label: "mleko" };
const NONE = { added: 0, removed: 0 };

describe("isRecipientEnabled – zgodne z przełącznikiem w Ustawieniach", () => {
  it("włączone: true", () => {
    expect(isRecipientEnabled(true)).toBe(true);
  });

  it("wyłączone: wyłącznie jawne false", () => {
    expect(isRecipientEnabled(false)).toBe(false);
  });

  it("brak wartości (brak wiersza ustawień) traktowany jak włączone – tak jak przełącznik i domyślna wartość kolumny", () => {
    expect(isRecipientEnabled(undefined)).toBe(true);
    expect(isRecipientEnabled(null)).toBe(true);
  });

  it("nietypowa wartość (np. tekst) nie wyłącza i nie włącza wprost: tylko false jest wyłączeniem", () => {
    expect(isRecipientEnabled("false")).toBe(true);
    expect(isRecipientEnabled(0)).toBe(true);
  });
});

describe("planListDelivery – decyzja o wysyłce", () => {
  it("włączone i zmiana potwierdzona → wysyłka", () => {
    expect(planListDelivery({ recipientPref: true, summary: ONE })).toEqual({ send: true });
  });

  it("wyłączone → brak wysyłki, nawet przy potwierdzonej zmianie", () => {
    expect(planListDelivery({ recipientPref: false, summary: ONE })).toEqual({ send: false });
    expect(planListDelivery({ recipientPref: false, summary: { added: 3, removed: 2 } })).toEqual({ send: false });
  });

  it("włączone, ale zmiana niepotwierdzona (0 i 0) → brak wysyłki", () => {
    expect(planListDelivery({ recipientPref: true, summary: NONE })).toEqual({ send: false });
  });

  it("brak wiersza ustawień (null) – wysyłka zgodnie z domyślnym włączeniem", () => {
    expect(planListDelivery({ recipientPref: null, summary: ONE })).toEqual({ send: true });
  });
});

describe("notify-shared – kolejność: preferencja, potem zapis i push", () => {
  const src = readFileSync(join(process.cwd(), "supabase/functions/notify-shared/index.ts"), "utf8");

  it("sprawdzenie preferencji odbiorcy jest przed zapisem do notifications i przed wysyłką push", () => {
    const check = src.indexOf("isRecipientEnabled(recipientPref)");
    const decision = src.indexOf("decideDelivery(body, rowData, recipientPref)");
    const insert = src.indexOf('.from("notifications").insert');
    const push = src.indexOf("await pushToRecipient(");
    expect(check).toBeGreaterThan(0);
    expect(decision).toBeGreaterThan(check);
    expect(insert).toBeGreaterThan(decision);
    expect(push).toBeGreaterThan(insert);
  });

  it("w funkcji nie ma innej ścieżki zapisu powiadomienia ani wysyłki push", () => {
    expect(src.match(/\.from\("notifications"\)\.insert/g)).toHaveLength(1);
    expect(src.match(/functions\/v1\/send-push/g)).toHaveLength(1);
  });

  it("błąd odczytu preferencji przerywa wysyłkę (zamiast wysłać mimo nieznanego ustawienia)", () => {
    expect(src).toMatch(/if \(prefsError\) throw prefsError;/);
  });
});
