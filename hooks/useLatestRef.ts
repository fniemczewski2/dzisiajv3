// hooks/useLatestRef.ts
//
// Ref z najnowszą wartością – dla callbacków, które nie powinny zmieniać
// tożsamości przy każdej zmianie danych. Wartość przypisujemy po renderze
// (useLayoutEffect), nie w trakcie – render ma być czysty.

import { useLayoutEffect, useRef } from "react";

export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
