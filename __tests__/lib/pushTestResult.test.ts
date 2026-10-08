// __tests__/lib/pushTestResult.test.ts

import { describe, it, expect } from "vitest";
import { describePushTestResult } from "@/lib/pushTestResult";

describe("describePushTestResult", () => {
  it("brak subskrypcji – wskazówka, by włączyć powiadomienia ponownie", () => {
    const r = describePushTestResult({ sent: 0, total: 0 });
    expect(r.ok).toBe(false);
    expect(r.message).toContain("Brak aktywnej subskrypcji");
  });
  it("odrzucenie 403 – przyczyna to klucz VAPID", () => {
    const r = describePushTestResult({ sent: 0, total: 1, failedStatusCodes: [403] });
    expect(r.ok).toBe(false);
    expect(r.message).toContain("VAPID");
  });
  it("inne odrzucenie – podaje kod", () => {
    expect(describePushTestResult({ sent: 0, total: 2, failedStatusCodes: [500, 500] }).message).toContain("kod 500");
  });
  it("sukces – liczba urządzeń", () => {
    expect(describePushTestResult({ sent: 1, total: 1 })).toEqual({ ok: true, message: "Wysłano na 1 urządzenie." });
    expect(describePushTestResult({ sent: 1, total: 2 }).message).toBe("Wysłano na 1 z 2 urządzeń.");
  });
});

import { describePushHttpError } from "@/lib/pushTestResult";

describe("describePushHttpError", () => {
  it("podaje status i przyczynę z serwera", () => {
    expect(describePushHttpError(500, { error: "Serwer nie ma skonfigurowanych kluczy VAPID." }))
      .toBe("Nie udało się wysłać powiadomienia testowego (błąd 500: Serwer nie ma skonfigurowanych kluczy VAPID.).");
  });
  it("401 – sesja", () => {
    expect(describePushHttpError(401, null)).toContain("zaloguj się ponownie");
  });
  it("404 – funkcja niewdrożona", () => {
    expect(describePushHttpError(404, null)).toContain("nie jest wdrożona");
  });
});
