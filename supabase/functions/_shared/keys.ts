// supabase/functions/_shared/keys.ts
//
// Nowy system kluczy API Supabase: publishable (sb_publishable_...) zamiast
// anon, secret (sb_secret_...) zamiast service_role. Platforma wstrzykuje je
// jako SUPABASE_PUBLISHABLE_KEYS / SUPABASE_SECRET_KEYS – JSON {nazwa: klucz},
// domyślny klucz nosi nazwę "default". Legacy SUPABASE_ANON_KEY /
// SUPABASE_SERVICE_ROLE_KEY nie są już używane.
//
// Klucze te wysyłamy wyłącznie w nagłówku `apikey` – nigdy w `Authorization`
// (platforma próbuje sparsować Authorization jako JWT i odrzuca opaque klucz).

function readKeyMap(envVar: string, keyName: string): string {
  const raw = Deno.env.get(envVar);
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed[keyName] ?? "";
  } catch (err) {
    console.error(`keys.ts: nie udało się sparsować ${envVar}:`, err instanceof Error ? err.message : err);
    return "";
  }
}

export function getSecretKey(keyName = "default"): string {
  return readKeyMap("SUPABASE_SECRET_KEYS", keyName);
}

export function getPublishableKey(keyName = "default"): string {
  return readKeyMap("SUPABASE_PUBLISHABLE_KEYS", keyName);
}
