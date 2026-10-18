// hooks/useNow.ts
//
// Bieżący czas jako stan zewnętrzny (useSyncExternalStore) – render pozostaje
// czysty (bez new Date() w trakcie renderu), a komponent odświeża się co
// `intervalMs`. Wszystkie komponenty z tym samym interwałem dzielą jeden zegar.

import { useSyncExternalStore } from "react";

interface ClockStore {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => Date;
}

const stores = new Map<number, ClockStore>();

function createClock(intervalMs: number): ClockStore {
  let now = new Date();
  let timer: ReturnType<typeof setInterval> | null = null;
  const listeners = new Set<() => void>();

  return {
    subscribe(onChange) {
      listeners.add(onChange);
      if (!timer) {
        now = new Date();
        timer = setInterval(() => {
          now = new Date();
          listeners.forEach((listener) => listener());
        }, intervalMs);
      }
      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0 && timer) {
          clearInterval(timer);
          timer = null;
        }
      };
    },
    getSnapshot: () => now,
  };
}

function clockStore(intervalMs: number): ClockStore {
  let store = stores.get(intervalMs);
  if (!store) {
    store = createClock(intervalMs);
    stores.set(intervalMs, store);
  }
  return store;
}

export function useNow(intervalMs = 60_000): Date {
  const store = clockStore(intervalMs);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
