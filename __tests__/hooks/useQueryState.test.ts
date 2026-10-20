// __tests__/hooks/useQueryState.test.ts

import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useQueryState } from "@/hooks/useQueryState";

const EMPTY: number[] = [];

describe("useQueryState", () => {
  it("refetch i setData mają stałą tożsamość między renderami", async () => {
    const { result, rerender } = renderHook(() =>
      useQueryState<number[]>({ queryKey: ["liczby"], queryFn: async () => [1, 2], initial: EMPTY })
    );
    await waitFor(() => expect(result.current.data).toEqual([1, 2]));
    const { refetch, setData } = result.current;
    rerender();
    act(() => result.current.setData([3]));
    expect(result.current.refetch).toBe(refetch);
    expect(result.current.setData).toBe(setData);
  });

  it("setData zmienia dane od razu (zmiana optymistyczna)", async () => {
    const { result } = renderHook(() =>
      useQueryState<number[]>({ queryKey: ["opt"], queryFn: async () => [1], initial: EMPTY })
    );
    await waitFor(() => expect(result.current.data).toEqual([1]));
    act(() => result.current.setData((prev) => [...prev, 2]));
    expect(result.current.data).toEqual([1, 2]);
  });
});
