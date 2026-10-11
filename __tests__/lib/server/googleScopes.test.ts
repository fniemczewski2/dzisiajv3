// __tests__/lib/server/googleScopes.test.ts

import { describe, it, expect } from "vitest";
import { GOOGLE_CALENDAR_SCOPES } from "@/lib/server/googleScopes";

describe("zakresy Google Calendar", () => {
  it("tylko trzy potrzebne zakresy", () => {
    expect([...GOOGLE_CALENDAR_SCOPES]).toEqual([
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ]);
  });
});
