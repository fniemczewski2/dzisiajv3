// lib/pushKeys.ts

import urlBase64ToUint8Array from "@/lib/urlBase64ToUint8Array";

/**
 * Czy subskrypcja push przeglądarki została utworzona z bieżącym kluczem VAPID.
 * Subskrypcja z innego (starego) klucza jest odrzucana przez usługę push przy
 * każdej wysyłce, a przeglądarka zwraca ją dalej z getSubscription() –
 * powiadomienia przestają przychodzić bez żadnego błędu w aplikacji.
 * Gdy przeglądarka nie udostępnia klucza (null), zakładamy zgodność.
 */
export function subscriptionMatchesVapidKey(
  subscription: Pick<PushSubscription, "options">,
  vapidPublicKey: string
): boolean {
  const current = subscription.options?.applicationServerKey;
  if (!current) return true;
  const used = new Uint8Array(current);
  const expected = urlBase64ToUint8Array(vapidPublicKey);
  return used.length === expected.length && used.every((byte, i) => byte === expected[i]);
}
