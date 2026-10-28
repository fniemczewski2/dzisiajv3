// __tests__/lib/mail/gmailAccess.test.ts

import { describe, it, expect, vi } from "vitest";
import { ACCESS_TOKEN_SKEW_MS, resolveGmailAccessToken } from "@/lib/mail/gmailAccess";

const NOW = Date.parse("2026-10-26T10:00:00Z");
const deps = (over: Partial<Parameters<typeof resolveGmailAccessToken>[1]> = {}) => ({
  decrypt: (v: string) => `plain:${v}`,
  encrypt: (v: string) => `enc:${v}`,
  refresh: vi.fn(async () => "FRESH"),
  persist: vi.fn(async () => undefined),
  now: NOW,
  ...over,
});

describe("resolveGmailAccessToken", () => {
  it("ważny token z bazy jest odszyfrowany i zwracany bez odświeżania", async () => {
    const d = deps();
    const token = await resolveGmailAccessToken(
      { access_token: "enc:A", refresh_token: "enc:R", expires_at: new Date(NOW + 3_600_000).toISOString() },
      d
    );
    expect(token).toBe("plain:enc:A");
    expect(d.refresh).not.toHaveBeenCalled();
  });

  it("token wygasający w ciągu minuty jest odświeżany i zapisywany ponownie", async () => {
    const d = deps();
    const token = await resolveGmailAccessToken(
      {
        access_token: "enc:A",
        refresh_token: "enc:R",
        expires_at: new Date(NOW + ACCESS_TOKEN_SKEW_MS / 2).toISOString(),
      },
      d
    );
    expect(token).toBe("FRESH");
    expect(d.refresh).toHaveBeenCalledWith("plain:enc:R");
    expect(d.persist).toHaveBeenCalledWith("enc:FRESH", expect.any(String));
  });

  it("wygasły token bez refresh tokenu daje null (konto do ponownego połączenia)", async () => {
    const d = deps();
    expect(
      await resolveGmailAccessToken({ access_token: "enc:A", refresh_token: null, expires_at: null }, d)
    ).toBeNull();
    expect(d.refresh).not.toHaveBeenCalled();
  });

  it("nieudane odświeżenie nie zapisuje niczego i zwraca null", async () => {
    const d = deps({ refresh: vi.fn(async () => null) });
    expect(
      await resolveGmailAccessToken({ access_token: "enc:A", refresh_token: "enc:R", expires_at: null }, d)
    ).toBeNull();
    expect(d.persist).not.toHaveBeenCalled();
  });
});
