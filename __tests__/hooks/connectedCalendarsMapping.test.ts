// __tests__/hooks/connectedCalendarsMapping.test.ts
//
// Dwa konta Google: każdy kalendarz musi trafić pod konto, z którego pochodzi.

import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({}) }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ toast: { error: vi.fn() } }) }));

import { fetchProviderCalendars } from "@/hooks/db/useConnectedCalendars";
import type { ConnectedAccount } from "@/types/events";

const accounts: ConnectedAccount[] = [
  { id: "acc-gmail", provider: "google", account_email: "a@gmail.com", google_calendar_id: "@account_connection" },
  { id: "acc-org", provider: "google", account_email: "a@org.pl", google_calendar_id: "@account_connection" },
  // kalendarz drugiego konta już włączony
  { id: "row-org-msk", provider: "google", account_email: "a@org.pl", google_calendar_id: "msk@group" },
];

const apiCalendars = [
  { id: "a@gmail.com", summary: "a@gmail.com", primary: true, primaryAccountId: "acc-gmail" },
  { id: "a@org.pl", summary: "a@org.pl", primary: true, primaryAccountId: "acc-org" },
  { id: "msk@group", summary: "MSK", primary: false, primaryAccountId: "acc-org" },
];

afterEach(() => vi.unstubAllGlobals());

describe("fetchProviderCalendars", () => {
  it("zostawia kalendarze przy koncie, z którego pochodzą, i rozpoznaje włączone", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ calendars: apiCalendars }), { status: 200 })));
    const withRetry = (<T,>(fn: () => Promise<T>) => fn()) as never;
    const result = await fetchProviderCalendars("google", accounts, "token", new AbortController().signal, withRetry, { error: vi.fn() } as never);

    const owner = Object.fromEntries(result.map((c) => [c.id, c.primaryAccountId]));
    expect(owner).toEqual({ "a@gmail.com": "acc-gmail", "a@org.pl": "acc-org", "msk@group": "acc-org" });
    expect(result.find((c) => c.id === "msk@group")?.accountId).toBe("row-org-msk");
    expect(result.find((c) => c.id === "a@gmail.com")?.accountId).toBeUndefined();
  });
});
