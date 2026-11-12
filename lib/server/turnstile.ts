// lib/server/turnstile.ts
//
// Weryfikacja tokenu Cloudflare Turnstile po stronie serwera (publiczne formularze ankiet).
// Gdy TURNSTILE_SECRET_KEY nie jest ustawiony, weryfikacja jest pomijana (lokalny development).
// Błąd sieci lub odpowiedź inna niż sukces blokuje żądanie: brak weryfikacji nie może otwierać formularza botom.

import type { NextApiRequest, NextApiResponse } from "next";
import { serverEnv } from "@/config/env";
import { TURNSTILE } from "@/config/server";
import { clientIp } from "@/lib/server/rateLimit";
import { fetchWithTimeout } from "@/lib/server/fetchWithTimeout";

type TurnstileVerdict = "passed" | "failed" | "unavailable";

interface SiteverifyResponse {
  success?: boolean;
}

async function verifyTurnstileToken(token: unknown, remoteIp: string | null): Promise<TurnstileVerdict> {
  const secret = serverEnv.turnstileSecretKey;
  if (!secret) return "passed";
  if (typeof token !== "string" || token.length === 0 || token.length > TURNSTILE.maxTokenLength) return "failed";

  const form = new URLSearchParams({ secret, response: token });
  if (remoteIp) form.set("remoteip", remoteIp);

  try {
    const response = await fetchWithTimeout(
      TURNSTILE.verifyUrl,
      { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form },
      TURNSTILE.timeoutMs
    );
    if (!response.ok) return "unavailable";
    const result = (await response.json()) as SiteverifyResponse;
    return result.success === true ? "passed" : "failed";
  } catch {
    return "unavailable";
  }
}

/** Zwraca true, gdy żądanie może iść dalej; w przeciwnym razie wysyła odpowiedź błędu (403 lub 503). */
export async function enforceTurnstile(req: NextApiRequest, res: NextApiResponse, token: unknown): Promise<boolean> {
  const verdict = await verifyTurnstileToken(token, clientIp(req));
  if (verdict === "passed") return true;
  if (verdict === "unavailable") {
    res.status(503).json({ error: "Weryfikacja antybotowa jest chwilowo niedostępna. Spróbuj ponownie za chwilę." });
    return false;
  }
  res
    .status(403)
    .json({ error: "Nie udało się potwierdzić, że jesteś człowiekiem. Odśwież stronę i spróbuj ponownie." });
  return false;
}
