// __tests__/lib/server/exportTarget.test.ts

import { describe, it, expect } from "vitest";
import { canAttachToTarget } from "@/lib/server/exportTarget";

const target = { rowId: "cal-1", calendarId: "primary", accountEmail: "a@b.pl" };

describe("canAttachToTarget", () => {
  it("zwykłe wydarzenie z aplikacji – tak", () => {
    expect(canAttachToTarget({ repeat: "none", calendar_id: null }, target)).toBe(true);
  });
  it("już przypięte do tego samego kalendarza – tak (aktualizacja)", () => {
    expect(canAttachToTarget({ repeat: "none", calendar_id: "cal-1" }, target)).toBe(true);
  });
  it("cykliczne – nie (synchronizacja zdjęłaby powtarzanie)", () => {
    expect(canAttachToTarget({ repeat: "weekly", calendar_id: null }, target)).toBe(false);
  });
  it("należące do innego zewnętrznego kalendarza – nie", () => {
    expect(canAttachToTarget({ repeat: "none", calendar_id: "cal-2" }, target)).toBe(false);
  });
});
