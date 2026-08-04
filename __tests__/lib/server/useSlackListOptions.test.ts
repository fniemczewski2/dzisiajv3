// __tests__/hooks/useSlackListOptions.test.ts

import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSlackListOptions } from "@/hooks/db/useSlackListOptions";

function mockStatus(response: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        ({
          ok,
          json: async () => response,
        }) as unknown as Response
    )
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useSlackListOptions", () => {
  it("kończy ładowanie i zwraca listy gotowe do użycia", async () => {
    mockStatus({
      lists: [
        {
          list_id: "F_A",
          list_title: "Zadania",
          is_default: true,
          column_map: { title: "Col001" },
        },
        // bez zmapowanej kolumny tytułu lista jest bezużyteczna
        { list_id: "F_B", list_title: "Szkice", is_default: false, column_map: {} },
      ],
    });

    const { result } = renderHook(() => useSlackListOptions(true));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.lists).toHaveLength(1);
    expect(result.current.defaultListId).toBe("F_A");
    expect(result.current.error).toBeNull();
  });

  it("nie odpytuje serwera, dopóki kategoria nie jest slackowa", () => {
    mockStatus({ lists: [] });
    const { result } = renderHook(() => useSlackListOptions(false));

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("wychodzi ze stanu ładowania także wtedy, gdy serwer zwróci błąd", async () => {
    mockStatus({ error: "Nie udało się odczytać list Slack: relacja nie istnieje" }, false);

    const { result } = renderHook(() => useSlackListOptions(true));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toContain("relacja nie istnieje");
    expect(result.current.lists).toEqual([]);
  });
});