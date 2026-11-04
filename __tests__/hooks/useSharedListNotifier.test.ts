// __tests__/hooks/useSharedListNotifier.test.ts
//
// Zbiorcze powiadomienia o zmianach wspólnej listy: opóźnienie, scalanie, znoszenie się zmian, wysyłka przy ukryciu karty.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { SupabaseClient } from "@supabase/supabase-js";

const h = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/lib/edgeFunctions", () => ({ invokeEdgeFunction: (...args: unknown[]) => h.invoke(...args) }));

import { useSharedListNotifier } from "@/hooks/useSharedListNotifier";

const supabase = {} as SupabaseClient;
const els = (...texts: string[]) => texts.map((text) => ({ text }));
const DELAY = 1000;

beforeEach(() => {
  vi.useFakeTimers();
  h.invoke.mockReset().mockResolvedValue({ ok: true, status: 200, data: {} });
});
afterEach(() => vi.useRealTimers());

const setup = (wait?: (id: string) => Promise<unknown>) =>
  renderHook(() => useSharedListNotifier(supabase, wait, DELAY));

describe("useSharedListNotifier", () => {
  it("kilka akcji jedna po drugiej → jedno powiadomienie po upływie opóźnienia", async () => {
    const { result } = setup();
    act(() => {
      result.current.track("L1", els("a"), els("a", "b"));
      result.current.track("L1", els("a", "b"), els("a", "b", "c"));
      result.current.track("L1", els("a", "b", "c"), els("a", "b", "c", "d"));
      result.current.track("L1", els("a", "b", "c", "d"), els("b", "c", "d"));
    });
    expect(h.invoke).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DELAY);
    });
    expect(h.invoke).toHaveBeenCalledTimes(1);
    expect(h.invoke).toHaveBeenCalledWith(supabase, "notify-shared", {
      kind: "list_item",
      id: "L1",
      added: ["b", "c", "d"],
      removed: ["a"],
    });
  });

  it("każda nowa zmiana przesuwa wysyłkę (odliczanie od ostatniej akcji)", async () => {
    const { result } = setup();
    act(() => result.current.track("L1", els(), els("a")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DELAY - 100);
    });
    act(() => result.current.track("L1", els("a"), els("a", "b")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DELAY - 100);
    });
    expect(h.invoke).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(h.invoke).toHaveBeenCalledTimes(1);
    expect(h.invoke.mock.calls[0][2]).toMatchObject({ added: ["a", "b"], removed: [] });
  });

  it("dodana i od razu usunięta pozycja nie generuje powiadomienia", async () => {
    const { result } = setup();
    act(() => {
      result.current.track("L1", els("a"), els("a", "b"));
      result.current.track("L1", els("a", "b"), els("a"));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DELAY * 3);
    });
    expect(h.invoke).not.toHaveBeenCalled();
  });

  it("odhaczenie pozycji nie jest zmianą do zgłoszenia", async () => {
    const { result } = setup();
    act(() => result.current.track("L1", els("a", "b"), els("b", "a")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DELAY * 2);
    });
    expect(h.invoke).not.toHaveBeenCalled();
  });

  it("różne listy mają osobne bufory i osobne powiadomienia", async () => {
    const { result } = setup();
    act(() => {
      result.current.track("L1", els(), els("a"));
      result.current.track("L2", els("x"), els());
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DELAY);
    });
    expect(h.invoke).toHaveBeenCalledTimes(2);
    const bodies = h.invoke.mock.calls.map((c) => c[2]);
    expect(bodies).toContainEqual({ kind: "list_item", id: "L1", added: ["a"], removed: [] });
    expect(bodies).toContainEqual({ kind: "list_item", id: "L2", added: [], removed: ["x"] });
  });

  it("po wysłaniu bufor jest pusty – kolejne zmiany tworzą nowe powiadomienie", async () => {
    const { result } = setup();
    act(() => result.current.track("L1", els(), els("a")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DELAY);
    });
    act(() => result.current.track("L1", els("a"), els("a", "b")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DELAY);
    });
    expect(h.invoke).toHaveBeenCalledTimes(2);
    expect(h.invoke.mock.calls[1][2]).toMatchObject({ added: ["b"], removed: [] });
  });

  it("wysyłka czeka na zapisy listy w toku", async () => {
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => (release = resolve));
    const { result } = setup(() => pending);
    act(() => result.current.track("L1", els(), els("a")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DELAY);
    });
    expect(h.invoke).not.toHaveBeenCalled();
    await act(async () => {
      release();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(h.invoke).toHaveBeenCalledTimes(1);
  });

  it("ukrycie karty wysyła zaległe powiadomienie od razu", async () => {
    const { result } = setup();
    act(() => result.current.track("L1", els(), els("a", "b")));
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(0);
    });
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    expect(h.invoke).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DELAY * 2);
    });
    expect(h.invoke).toHaveBeenCalledTimes(1);
  });

  it("zamknięcie widoku (odmontowanie) wysyła zaległe powiadomienie", async () => {
    const { result, unmount } = setup();
    act(() => result.current.track("L1", els(), els("a")));
    unmount();
    await vi.advanceTimersByTimeAsync(0);
    expect(h.invoke).toHaveBeenCalledTimes(1);
  });

  it("błąd wysyłki jest połykany – nie psuje pracy z listą", async () => {
    h.invoke.mockRejectedValue(new Error("sieć"));
    const { result } = setup();
    act(() => result.current.track("L1", els(), els("a")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DELAY);
    });
    expect(h.invoke).toHaveBeenCalledTimes(1);
  });
});
