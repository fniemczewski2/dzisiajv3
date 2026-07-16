import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const VALID_KEY = Buffer.alloc(32, 7).toString("base64"); // 32-bajtowy klucz w base64

describe("lib/server/tokenCrypto", () => {
  const originalKey = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = originalKey;
  });

  it("round-trips a plaintext token through encrypt then decrypt", async () => {
    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = VALID_KEY;
    const { encryptToken, decryptToken } = await import("@/lib/server/tokenCrypto");

    const plaintext = "ya29.super-secret-google-refresh-token";
    const encrypted = encryptToken(plaintext);

    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(decryptToken(encrypted)).toBe(plaintext);
  });

  it("returns an empty string for empty/undefined/null input without touching the key", async () => {
    delete process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
    const { encryptToken, decryptToken } = await import("@/lib/server/tokenCrypto");

    expect(encryptToken("")).toBe("");
    expect(decryptToken(null)).toBe("");
    expect(decryptToken(undefined)).toBe("");
  });

  it("passes through a value that was never encrypted (no v1: prefix)", async () => {
    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = VALID_KEY;
    const { decryptToken } = await import("@/lib/server/tokenCrypto");

    expect(decryptToken("plain-legacy-token")).toBe("plain-legacy-token");
  });

  it("throws a descriptive error when the encryption key is missing", async () => {
    delete process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
    const { encryptToken } = await import("@/lib/server/tokenCrypto");

    expect(() => encryptToken("secret")).toThrow(/CALENDAR_TOKEN_ENCRYPTION_KEY/);
  });

  it("throws when the key is not a 32-byte base64 value", async () => {
    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = Buffer.alloc(16).toString("base64"); // za krótki
    const { encryptToken } = await import("@/lib/server/tokenCrypto");

    expect(() => encryptToken("secret")).toThrow(/32 bajtów/);
  });

  it("throws on a malformed stored token (wrong number of segments)", async () => {
    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = VALID_KEY;
    const { decryptToken } = await import("@/lib/server/tokenCrypto");

    expect(() => decryptToken("v1:only-one-part")).toThrow(/Nieprawidłowy format/);
  });

  it("fails to decrypt when a different key was used to encrypt (auth tag mismatch)", async () => {
    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = VALID_KEY;
    const { encryptToken } = await import("@/lib/server/tokenCrypto");
    const encrypted = encryptToken("secret-token");

    vi.resetModules();
    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
    const { decryptToken } = await import("@/lib/server/tokenCrypto");

    expect(() => decryptToken(encrypted)).toThrow();
  });

  it("produces a different ciphertext each time (random IV) for the same plaintext", async () => {
    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = VALID_KEY;
    const { encryptToken } = await import("@/lib/server/tokenCrypto");

    const a = encryptToken("same-plaintext");
    const b = encryptToken("same-plaintext");
    expect(a).not.toBe(b);
  });
});
