import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRetry } from "@/hooks/useRetry";

describe("useRetry", () => {
  it("returns the result immediately when the operation succeeds on the first try", async () => {
    const { result } = renderHook(() => useRetry());
    const operation = vi.fn().mockResolvedValue("ok");

    const value = await result.current(operation);

    expect(value).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries once after a failure and returns the result of the second attempt", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useRetry());
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error("network blip"))
      .mockResolvedValueOnce("recovered");

    const promise = result.current(operation);
    await vi.runAllTimersAsync();
    const value = await promise;

    expect(value).toBe("recovered");
    expect(operation).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("gives up and rethrows the second error if both attempts fail", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useRetry());
    const secondError = new Error("still down");
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error("first failure"))
      .mockRejectedValueOnce(secondError);

    const promise = result.current(operation);
    // Dołączamy obsługę odrzucenia zanim czas zacznie płynąć, żeby uniknąć
    // "unhandled rejection" zanim assercja zdąży je przechwycić.
    const assertion = expect(promise).rejects.toThrow("still down");
    await vi.runAllTimersAsync();
    await assertion;
    expect(operation).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("returns a stable function reference across re-renders (safe to use as a dependency)", () => {
    const { result, rerender } = renderHook(() => useRetry());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
