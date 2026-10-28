// __tests__/lib/mail/tasks.test.ts

import { describe, it, expect } from "vitest";
import { MAIL_TASK_CATEGORY, replyTaskTitle } from "@/lib/mail/tasks";

describe("replyTaskTitle", () => {
  it("tworzy tytuł Odpowiedz: <temat>", () => {
    expect(replyTaskTitle("Faktura za październik")).toBe("Odpowiedz: Faktura za październik");
  });
  it("usuwa prefiksy Re:, Odp:, Fwd: (także wielokrotne)", () => {
    expect(replyTaskTitle("Re: RE: Fwd: Umowa")).toBe("Odpowiedz: Umowa");
    expect(replyTaskTitle("Odp: Umowa")).toBe("Odpowiedz: Umowa");
  });
  it("pusty temat dostaje zastępczy tytuł", () => {
    expect(replyTaskTitle("   ")).toBe("Odpowiedz: (bez tematu)");
  });
  it("kategoria to poczta", () => {
    expect(MAIL_TASK_CATEGORY).toBe("poczta");
  });
});
