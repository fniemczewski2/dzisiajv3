// __tests__/lib/mail/mailTasks.test.ts

import { describe, it, expect } from "vitest";
import { buildMailTaskRow } from "@/lib/mail/mailTasks";

describe("buildMailTaskRow", () => {
  const row = buildMailTaskRow({
    subject: "Re: Faktura",
    from: "Anna <anna@example.com>",
    userId: "u1",
    today: "2026-10-26",
  });

  it("ma tytuł Odpowiedz, kategorię poczta i status oczekujący", () => {
    expect(row).toMatchObject({ title: "Odpowiedz: Faktura", category: "poczta", status: "pending", user_id: "u1" });
  });

  it("zapisuje nadawcę, a nie treść wiadomości", () => {
    expect(row.description).toBe("Od: Anna <anna@example.com>");
    expect(Object.values(row).join(" ")).not.toMatch(/treść/i);
  });
});
