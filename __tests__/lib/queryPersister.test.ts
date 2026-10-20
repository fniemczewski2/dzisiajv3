// __tests__/lib/queryPersister.test.ts

import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import type { Query } from "@tanstack/react-query";
import type { PersistedClient } from "@tanstack/react-query-persist-client";
import { queryPersister, shouldPersistQuery } from "@/lib/queryPersister";

const q = (key: string, status = "success") => ({ queryKey: [key], state: { status } }) as unknown as Query;
const client = (marker: string) =>
  ({ timestamp: 1, buster: marker, clientState: { queries: [], mutations: [] } }) as PersistedClient;

describe("zapis pamięci zapytań w IndexedDB", () => {
  it("zapisuje dane użytkownika, pomija dane na żywo i błędy", () => {
    expect(shouldPersistQuery(q("tasks"))).toBe(true);
    expect(shouldPersistQuery(q("train-status"))).toBe(false);
    expect(shouldPersistQuery(q("nearby-departures"))).toBe(false);
    expect(shouldPersistQuery(q("tasks", "error"))).toBe(false);
  });

  it("zapisuje najwyżej raz na sekundę (ostatni stan) i odtwarza zapis", async () => {
    vi.useFakeTimers();
    queryPersister.persistClient(client("a"));
    queryPersister.persistClient(client("b"));
    await vi.advanceTimersByTimeAsync(1100);
    vi.useRealTimers();
    await vi.waitFor(async () => expect((await queryPersister.restoreClient())?.buster).toBe("b"));
  });

  it("usunięcie (wylogowanie) kasuje zapis i zaplanowany zapis", async () => {
    queryPersister.persistClient(client("c"));
    await queryPersister.removeClient();
    expect(await queryPersister.restoreClient()).toBeUndefined();
  });
});
