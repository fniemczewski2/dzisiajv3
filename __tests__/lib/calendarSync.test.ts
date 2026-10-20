// __tests__/lib/calendarSync.test.ts
//
// Edycja i usunięcie wydarzenia powiązanego z Google/Outlookiem trafia do
// kalendarza zewnętrznego; wydarzenia niepowiązane i cudze – nie.

import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { syncLinkedEventChange } from "@/lib/calendarExport";

const calendar = { id: "cal-1", provider: "google", google_calendar_id: "work@group", calendar_name: "Praca" };
const supabase = {
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: calendar }) }) }) }),
  auth: { getSession: () => Promise.resolve({ data: { session: { access_token: "jwt" } } }) },
} as unknown as SupabaseClient;

const linked = { id: "ev-1", user_id: "u1", google_event_id: "g-123", calendar_id: "cal-1" };

afterEach(() => vi.unstubAllGlobals());

describe("syncLinkedEventChange", () => {
  it("edycja wysyła wydarzenie do powiązanego kalendarza (eksport = aktualizacja)", async () => {
    const fetchSpy = vi.fn((_url: string, _init?: RequestInit) =>
      Promise.resolve(new Response(JSON.stringify({ exported: 1 }), { status: 200 }))
    );
    vi.stubGlobal("fetch", fetchSpy);
    const result = await syncLinkedEventChange(supabase, linked, "update", "u1");
    expect(result).toEqual({ linked: true, ok: true, label: "Google: Praca" });
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/google-calendar?action=export");
    expect(JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)).toEqual({
      connectedCalendarId: "cal-1",
      eventIds: ["ev-1"],
    });
  });

  it("usunięcie wywołuje delete-remote", async () => {
    const fetchSpy = vi.fn((_url: string, _init?: RequestInit) =>
      Promise.resolve(new Response(JSON.stringify({ deleted: true }), { status: 200 }))
    );
    vi.stubGlobal("fetch", fetchSpy);
    const result = await syncLinkedEventChange(supabase, linked, "delete", "u1");
    expect(result.ok).toBe(true);
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/google-calendar?action=delete-remote");
  });

  it("niepowiązane i cudze wydarzenia nie trafiają do kalendarza", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await syncLinkedEventChange(supabase, { id: "x", user_id: "u1" }, "update", "u1")).toEqual({
      linked: false,
      ok: true,
    });
    expect(await syncLinkedEventChange(supabase, { ...linked, user_id: "inny" }, "delete", "u1")).toEqual({
      linked: false,
      ok: true,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("błąd po stronie dostawcy zwraca ok: false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("{}", { status: 502 })))
    );
    expect((await syncLinkedEventChange(supabase, linked, "delete", "u1")).ok).toBe(false);
  });
});
