// __tests__/lib/mail/accountRules.test.ts

import { describe, it, expect } from "vitest";
import {
  MAX_MAIL_ACCOUNTS,
  buildGoogleAuthUrl,
  normalizeEmail,
  parseTokenResponse,
  planAccountSave,
  profileEmail,
  toPublicAccount,
} from "@/lib/mail/accountRules";

describe("planAccountSave", () => {
  it("nowe konto przy wolnym miejscu i refresh tokenie: insert", () => {
    expect(planAccountSave({ count: 0, exists: false, hasRefreshToken: true })).toEqual({ action: "insert" });
  });
  it("istniejące konto: update (także bez refresh tokenu)", () => {
    expect(planAccountSave({ count: 3, exists: true, hasRefreshToken: false })).toEqual({ action: "update" });
  });
  it("limit kont blokuje nowe konto", () => {
    expect(planAccountSave({ count: MAX_MAIL_ACCOUNTS, exists: false, hasRefreshToken: true })).toEqual({
      action: "reject",
      reason: "limit",
    });
  });
  it("nowe konto bez refresh tokenu jest odrzucane (wymagana pełna zgoda)", () => {
    expect(planAccountSave({ count: 0, exists: false, hasRefreshToken: false })).toEqual({
      action: "reject",
      reason: "no_refresh",
    });
  });
});

describe("normalizeEmail", () => {
  it("przycina i zmienia na małe litery", () => {
    expect(normalizeEmail("  Anna@Example.COM ")).toBe("anna@example.com");
  });
  it("odrzuca nieprawidłowe adresy", () => {
    expect(normalizeEmail("bez-malpy.pl")).toBeNull();
    expect(normalizeEmail("a b@x.pl")).toBeNull();
    expect(normalizeEmail("")).toBeNull();
  });
});

describe("parseTokenResponse", () => {
  it("wylicza czas wygaśnięcia z expires_in", () => {
    const t = parseTokenResponse({ access_token: "A", refresh_token: "R", expires_in: 3600 }, 0);
    expect(t).toEqual({ accessToken: "A", refreshToken: "R", expiresAt: new Date(3600 * 1000).toISOString() });
  });
  it("brak refresh_token to null (ponowne połączenie)", () => {
    expect(parseTokenResponse({ access_token: "A" })?.refreshToken).toBeNull();
  });
  it("brak access_token odrzuca odpowiedź", () => {
    expect(parseTokenResponse({ error: "invalid_grant" })).toBeNull();
    expect(parseTokenResponse(null)).toBeNull();
  });
});

describe("profileEmail", () => {
  it("odczytuje pole email z profilu", () => {
    expect(profileEmail({ email: "a@b.pl" })).toBe("a@b.pl");
    expect(profileEmail({})).toBeNull();
  });
});

describe("buildGoogleAuthUrl", () => {
  const url = new URL(
    buildGoogleAuthUrl({
      clientId: "cid",
      redirectUri: "https://dzisiaj.fun/api/mail/gmail/callback",
      scopes: ["s1", "s2"],
      state: "nonce",
    })
  );
  it("zawiera wymagane parametry OAuth", () => {
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("cid");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("state")).toBe("nonce");
    expect(url.searchParams.get("scope")).toBe("s1 s2");
  });
  it("wymusza zgodę, żeby Google zwrócił refresh token", () => {
    expect(url.searchParams.get("prompt")).toContain("consent");
  });
});

describe("toPublicAccount", () => {
  it("nie przepisuje tokenów do widoku klienta", () => {
    const view = toPublicAccount({
      id: "1",
      provider: "gmail",
      email: "a@b.pl",
      created_at: "2026-10-25T10:00:00Z",
      access_token: "SECRET",
      refresh_token: "SECRET2",
    });
    expect(view).toEqual({
      id: "1",
      provider: "gmail",
      email: "a@b.pl",
      createdAt: "2026-10-25T10:00:00Z",
      canDeleteInMailbox: false,
    });
    expect(JSON.stringify(view)).not.toContain("SECRET");
  });
  it("niepoprawny wiersz daje null", () => {
    expect(toPublicAccount({ id: "1", provider: "yahoo", email: "a@b.pl", created_at: "x" })).toBeNull();
  });
});

import { canDeleteInMailbox } from "@/lib/mail/accountRules";

describe("canDeleteInMailbox", () => {
  it("Gmail: tylko gmail.modify pozwala przenosić do kosza", () => {
    expect(
      canDeleteInMailbox(
        "gmail",
        "https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send"
      )
    ).toBe(true);
    expect(
      canDeleteInMailbox(
        "gmail",
        "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send"
      )
    ).toBe(false);
    expect(canDeleteInMailbox("gmail", "https://www.googleapis.com/auth/gmail.modifyX")).toBe(false);
  });
  it("Outlook: Mail.ReadWrite tak, Mail.Read nie", () => {
    expect(canDeleteInMailbox("outlook", "offline_access User.Read Mail.ReadWrite Mail.Send")).toBe(true);
    expect(canDeleteInMailbox("outlook", "offline_access User.Read Mail.Read Mail.Send")).toBe(false);
    expect(canDeleteInMailbox("outlook", null)).toBe(false);
  });
});
