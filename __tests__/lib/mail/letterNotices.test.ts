// __tests__/lib/mail/letterNotices.test.ts

import { describe, it, expect } from "vitest";
import { classifyNotice, toLetterNotices } from "@/lib/mail/letterNotices";

describe("classifyNotice", () => {
  it.each([
    ["Urzędowe Poświadczenie Przedłożenia (UPP)", "UPP"],
    ["Otrzymano UPO dla dokumentu", "UPO"],
    ["Nowa wiadomość w skrzynce e-Doręczeń", "e-Doręczenia"],
    ["Dowód otrzymania", "e-Doręczenia"],
    ["Powiadomienie ePUAP", "ePUAP"],
    ["Faktura za prąd", null],
  ])("%s → %s", (text, kind) => {
    expect(classifyNotice(text)).toBe(kind);
  });
});

describe("toLetterNotices", () => {
  it("usuwa duplikaty, data w czasie polskim, najnowsze pierwsze", () => {
    const out = toLetterNotices("acc", [
      { id: "1", threadId: "a", subject: "UPP – wniosek", from: "a@b", date: "2026-11-02T23:30:00Z" },
      { id: "1", threadId: "a", subject: "UPP – wniosek", from: "a@b", date: "2026-11-02T23:30:00Z" },
      { id: "2", threadId: "b", subject: "Newsletter", from: "c@d", date: "2026-11-05T10:00:00Z" },
      { id: "3", threadId: "c", subject: "ePUAP", from: "e@f", date: "2026-11-04T10:00:00Z" },
    ]);
    expect(out.map((n) => [n.messageId, n.date])).toEqual([
      ["3", "2026-11-04"],
      ["1", "2026-11-03"],
    ]);
  });
});
