// hooks/useIsClient.ts
//
// Wartości dostępne tylko w przeglądarce bez efektu ustawiającego stan po
// zamontowaniu (useSyncExternalStore: na serwerze i przy hydratacji wartość
// serwerowa, potem kliencka – bez dodatkowego renderu w efekcie).

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** `true` po stronie przeglądarki, `false` na serwerze i podczas hydratacji. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

/** Adres aplikacji (origin) w przeglądarce; pusty tekst na serwerze. */
export function useOrigin(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => globalThis.location.origin,
    () => ""
  );
}
