// __tests__/components/GlobalSearch.test.tsx
//
// Wyszukiwarka globalna: starsze zapytanie, które wróci po nowszym, nie
// nadpisuje wyników; błąd bazy kończy wyszukiwanie komunikatem, a stan jest
// ogłaszany czytnikom ekranu.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

type Result = { data: Record<string, unknown>[] | null; error: { message: string } | null };
const pending: { pattern: string; resolve: (r: Result) => void }[] = [];

const supabase = {
  from: () => ({
    select: () => ({
      ilike: (_column: string, pattern: string) => ({
        limit: () =>
          new Promise<Result>((resolve) => {
            pending.push({ pattern, resolve });
          }),
      }),
    }),
  }),
};

vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ supabase, user: { id: "u1" } }) }));
vi.mock("@/hooks/useEnabledModules", () => ({
  useEnabledModules: () => ({ isEnabled: (href: string) => href === "/tasks" }),
}));
vi.mock("next/router", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import GlobalSearch from "@/components/ui/GlobalSearch";

async function typeQuery(text: string) {
  fireEvent.click(screen.getByRole("button", { name: /Szukaj w aplikacji \(Ctrl\+K\)/ }));
  // <dialog> w jsdom nie otwiera się (brak showModal), więc pole jest „ukryte” dla drzewa dostępności.
  const input = screen.getByRole("textbox", { name: "Szukaj w aplikacji", hidden: true });
  fireEvent.change(input, { target: { value: text } });
  await act(async () => {
    vi.advanceTimersByTime(300);
  });
}

beforeEach(() => {
  pending.length = 0;
  vi.useFakeTimers();
});

describe("GlobalSearch", () => {
  it("pomija wynik starszego zapytania, które wróciło po nowszym", async () => {
    render(<GlobalSearch />);
    await typeQuery("ko");
    await typeQuery("kot");
    const older = pending.find((p) => p.pattern === "%ko%");
    const newer = pending.find((p) => p.pattern === "%kot%");
    await act(async () => newer?.resolve({ data: [{ id: 1, title: "Kot nowy" }], error: null }));
    await act(async () => older?.resolve({ data: [{ id: 2, title: "Koło stare" }], error: null }));
    expect(screen.getByText("Kot nowy")).toBeInTheDocument();
    expect(screen.queryByText("Koło stare")).not.toBeInTheDocument();
    expect(screen.getByText("Wyniki: 1.")).toBeInTheDocument();
  });

  it("po błędzie bazy kończy wyszukiwanie i pokazuje komunikat", async () => {
    render(<GlobalSearch />);
    await typeQuery("pies");
    await act(async () => pending.at(-1)?.resolve({ data: null, error: { message: "boom" } }));
    expect(screen.getByText(/Nie udało się przeszukać danych/)).toBeInTheDocument();
    expect(screen.getByText("Wyszukiwanie nie powiodło się.")).toBeInTheDocument();
  });

  it("escapuje znaki specjalne LIKE we wzorcu", async () => {
    render(<GlobalSearch />);
    await typeQuery("50%_\\");
    expect(pending.at(-1)?.pattern).toBe(String.raw`%50\%\_\\%`);
  });
});
