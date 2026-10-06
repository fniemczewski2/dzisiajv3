// lib/server/oauthState.ts

import type { NextApiResponse } from "next";

/**
 * Nonce OAuth jest jednorazowy – kasujemy ciasteczko niezależnie od wyniku.
 * Dopisujemy nagłówek (appendHeader), a nie nadpisujemy: klient Supabase
 * w tym samym żądaniu może ustawiać własne ciasteczka sesji.
 */
export function clearStateCookie(res: NextApiResponse, name: string, secure = true) {
  const securePart = secure ? " Secure;" : "";
  res.appendHeader("Set-Cookie", `${name}=; HttpOnly;${securePart} SameSite=Lax; Max-Age=0; Path=/`);
}
