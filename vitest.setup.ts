import "@testing-library/jest-dom/vitest";

// Wiele komponentów/hooków odwołuje się do window.matchMedia (next-themes),
// którego jsdom nie implementuje - podstawiamy prosty stub.
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
