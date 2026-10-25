// __tests__/config/rejectPlaintextTokens.test.ts
//
// Domyślne odrzucanie tokenów bez szyfrowania w produkcji oraz zgodność tekstu polityki prywatności
// z zachowaniem powiadomień (treść zapisywana jawnie, szyfrowany jest transport Web Push).

import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { serverEnv } from "@/config/env";

const saved = { NODE_ENV: process.env.NODE_ENV, FLAG: process.env.REJECT_PLAINTEXT_TOKENS };

function setEnv(nodeEnv: string | undefined, flag: string | undefined) {
  if (nodeEnv === undefined) delete (process.env as Record<string, string | undefined>).NODE_ENV;
  else (process.env as Record<string, string | undefined>).NODE_ENV = nodeEnv;
  if (flag === undefined) delete process.env.REJECT_PLAINTEXT_TOKENS;
  else process.env.REJECT_PLAINTEXT_TOKENS = flag;
}

afterEach(() => {
  setEnv(saved.NODE_ENV, saved.FLAG);
});

describe("rejectPlaintextTokens", () => {
  it("w produkcji bez flagi odrzuca tokeny bez szyfrowania", () => {
    setEnv("production", undefined);
    expect(serverEnv.rejectPlaintextTokens).toBe(true);
  });
  it("poza produkcją bez flagi nie zmienia zachowania", () => {
    setEnv("development", undefined);
    expect(serverEnv.rejectPlaintextTokens).toBe(false);
  });
  it("flaga 0 wyłącza odrzucanie także w produkcji (na czas migracji)", () => {
    setEnv("production", "0");
    expect(serverEnv.rejectPlaintextTokens).toBe(false);
  });
  it("flaga 1 wymusza odrzucanie poza produkcją", () => {
    setEnv("test", "1");
    expect(serverEnv.rejectPlaintextTokens).toBe(true);
  });
});

describe("polityka prywatności – powiadomienia", () => {
  it("nie twierdzi, że treść powiadomień jest szyfrowana przed zapisem w bazie", () => {
    const text = readFileSync("pages/privacy.tsx", "utf8").replace(/\s+/g, " ");
    expect(text).not.toMatch(/Treść powiadomień[^.]*szyfrowana przed wysłaniem/);
    expect(text).toMatch(/zapisujemy w bazie danych w postaci jawnej/);
  });
});
