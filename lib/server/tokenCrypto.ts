// lib/server/tokenCrypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12; 
const VERSION_PREFIX = "v1";

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "CALENDAR_TOKEN_ENCRYPTION_KEY nie jest ustawiony. Wygeneruj klucz: " +
        "`node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"` " +
        "i dodaj jako zmienną środowiskową (nigdy do repo)."
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "CALENDAR_TOKEN_ENCRYPTION_KEY musi być kluczem base64 o długości 32 bajtów (256 bitów)."
    );
  }

  cachedKey = key;
  return key;
}

export function encryptToken(plaintext: string): string {
  if (!plaintext) return "";

  const key = getKey();
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION_PREFIX,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptToken(stored: string | null | undefined): string {
  if (!stored) return "";
  if (!stored.startsWith(`${VERSION_PREFIX}:`)) return stored;

  const parts = stored.split(":");
  if (parts.length !== 4) {
    throw new Error("Nieprawidłowy format zaszyfrowanego tokenu (oczekiwano v1:iv:authTag:ciphertext).");
  }
  const [, ivB64, authTagB64, dataB64] = parts;

  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}