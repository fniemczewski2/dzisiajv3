// __tests__/lib/calendarExport.test.ts

import { describe, it, expect, vi, afterEach } from "vitest";
import { exportEventToCalendar, calendarTargetLabel } from "@/lib/calendarExport";

const google = { id: "cal-1", provider: "google" as const, google_calendar_id: "primary", calendar_name: "Praca" };
const outlook = { id: "cal-2", provider: "outlook" as const, google_calendar_id: "AAMk", calendar_name: null };

function mockFetch(response: { ok: boolean; body?: unknown } | Error) {
  const fn = vi.fn(() =>
    response instanceof Error
      ? Promise.reject(response)
      : Promise.resolve({ ok: response.ok, json: () => Promise.resolve(response.body ?? {}) })
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("exportEventToCalendar", () => {
  it("wysyła wybrany kalendarz i id wydarzenia do właściwego endpointu", async () => {
    const fetchMock = mockFetch({ ok: true, body: { exported: 1, skipped: 0 } });
    expect(await exportEventToCalendar(google, "ev-1", "tok")).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/google-calendar?action=export");
    expect(JSON.parse(init.body as string)).toEqual({ connectedCalendarId: "cal-1", eventIds: ["ev-1"] });
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("Outlook idzie do swojego endpointu", async () => {
    const fetchMock = mockFetch({ ok: true, body: { exported: 1 } });
    await exportEventToCalendar(outlook, "ev-1", "tok");
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe("/api/outlook-calendar?action=export");
  });

  it("błąd HTTP to porażka (wcześniej przechodził po cichu)", async () => {
    mockFetch({ ok: false, body: { error: "x" } });
    expect(await exportEventToCalendar(google, "ev-1", "tok")).toBe(false);
  });

  it("odpowiedź „wyeksportowano 0” to porażka", async () => {
    mockFetch({ ok: true, body: { exported: 0, skipped: 1 } });
    expect(await exportEventToCalendar(google, "ev-1", "tok")).toBe(false);
  });

  it("błąd sieci to porażka", async () => {
    mockFetch(new Error("offline"));
    expect(await exportEventToCalendar(google, "ev-1", "tok")).toBe(false);
  });
});

describe("calendarTargetLabel", () => {
  it("podpisuje dostawcę także dla Outlooka", () => {
    expect(calendarTargetLabel(google)).toBe("Google: Praca");
    expect(calendarTargetLabel(outlook)).toBe("Outlook: AAMk");
  });
});
