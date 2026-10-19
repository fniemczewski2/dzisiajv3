// vitest.setup.ts

import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import type React from "react";

process.env.TZ = "Europe/Warsaw";

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
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

// Każdy render w testach dostaje własny, świeży klient TanStack Query
// (hooki danych korzystają z useQuery). Własny `wrapper` testu jest zachowany.
vi.mock("@testing-library/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@testing-library/react")>();
  const { createElement } = await import("react");
  const { QueryClient, QueryClientProvider, notifyManager } = await import("@tanstack/react-query");
  // Ten sam harmonogram powiadomień co w aplikacji (lib/queryClient.ts).
  notifyManager.setScheduler((callback) => callback());

  function withQueryClient(options?: { wrapper?: React.JSXElementConstructor<{ children: React.ReactNode }> }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const Inner = options?.wrapper;
    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, Inner ? createElement(Inner, null, children) : children);
    return { ...options, wrapper: Wrapper };
  }

  return {
    ...actual,
    render: ((ui: React.ReactElement, options?: Parameters<typeof actual.render>[1]) =>
      actual.render(ui, withQueryClient(options as never) as never)) as typeof actual.render,
    renderHook: ((cb: (props: unknown) => unknown, options?: Parameters<typeof actual.renderHook>[1]) =>
      actual.renderHook(cb, withQueryClient(options as never) as never)) as typeof actual.renderHook,
  };
});
