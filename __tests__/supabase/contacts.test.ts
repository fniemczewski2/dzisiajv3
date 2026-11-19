// __tests__/supabase/contacts.test.ts

import { describe, it, expect } from "vitest";
import { isContactOverdue } from "@/shared/contacts";

const now = new Date("2026-11-20T12:00:00Z");

describe("isContactOverdue", () => {
  it("progi według priorytetu (wspólne dla aplikacji i push)", () => {
    expect(isContactOverdue(3, "2026-09-21T12:00:00Z", now)).toBe(true);
    expect(isContactOverdue(3, "2026-09-22T12:00:00Z", now)).toBe(false);
    expect(isContactOverdue(1, "2026-11-06T12:00:00Z", now)).toBe(true);
  });

  it("priorytet 0 i 5 bez przypomnień; brak daty = zaległy", () => {
    expect(isContactOverdue(5, null, now)).toBe(false);
    expect(isContactOverdue(0, null, now)).toBe(false);
    expect(isContactOverdue(2, null, now)).toBe(true);
  });
});
