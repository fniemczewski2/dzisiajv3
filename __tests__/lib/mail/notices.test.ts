// __tests__/lib/mail/notices.test.ts

import { describe, it, expect } from "vitest";
import { callbackNoticeFor } from "@/lib/mail/notices";

describe("callbackNoticeFor", () => {
  it("po połączeniu Gmail i Outlook pokazuje potwierdzenie (klucze zgodne z przekierowaniami tras)", () => {
    expect(callbackNoticeFor("gmail")).toBe("Konto Gmail zostało podłączone.");
    expect(callbackNoticeFor("outlook")).toBe("Konto Outlook zostało podłączone.");
  });
  it("nieznany klucz daje ogólny błąd", () => {
    expect(callbackNoticeFor("cos_nowego")).toBe("Wystąpił błąd połączenia.");
  });
});
