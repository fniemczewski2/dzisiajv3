// vitest.setup.ts

import "@testing-library/jest-dom/vitest";

// Aplikacja zakłada strefę polską (godziny z biletów, czas PKP PLK), więc testy
// muszą działać w tej samej strefie niezależnie od maszyny, na której biegną.
process.env.TZ = "Europe/Warsaw";

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}
