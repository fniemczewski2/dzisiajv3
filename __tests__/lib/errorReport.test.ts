// __tests__/lib/errorReport.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";

const invoke = vi.fn();
const getSession = vi.fn();
vi.mock("@/lib/edgeFunctions", () => ({ invokeEdgeFunction: (...args: unknown[]) => invoke(...args) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { getSession } }) }));

async function load() {
  vi.resetModules();
  return import("@/lib/errorReport");
}

beforeEach(() => {
  invoke.mockReset().mockResolvedValue({ ok: true, status: 200, data: { ok: true } });
  getSession.mockReset().mockResolvedValue({ data: { session: { access_token: "t" } } });
});

describe("reportError", () => {
  it("wysyła kontekst, wiadomość i stack do funkcji log-error", async () => {
    const { reportError } = await load();
    await reportError("ErrorBoundary", new Error("boom"));
    expect(invoke).toHaveBeenCalledTimes(1);
    const [, name, body] = invoke.mock.calls[0];
    expect(name).toBe("log-error");
    expect(body).toMatchObject({ context: "ErrorBoundary", message: "boom" });
    expect(body.stack).toContain("boom");
  });

  it("usuwa adresy e-mail z wiadomości i stacku", async () => {
    const { reportError } = await load();
    await reportError("window.error", new Error("nie udało się dla jan.kowalski@example.com"));
    const body = invoke.mock.calls[0][2];
    expect(body.message).toBe("nie udało się dla [email]");
    expect(body.message).not.toContain("example.com");
  });

  it("bez zalogowanej sesji nic nie wysyła", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const { reportError } = await load();
    await reportError("window.error", new Error("x"));
    expect(invoke).not.toHaveBeenCalled();
  });

  it("ten sam błąd w tym samym kontekście wysyła się raz", async () => {
    const { reportError } = await load();
    await reportError("window.error", new Error("powtórka"));
    await reportError("window.error", new Error("powtórka"));
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("ignoruje szum ResizeObserver", async () => {
    const { reportError } = await load();
    await reportError("window.error", new Error("ResizeObserver loop completed with undelivered notifications."));
    expect(invoke).not.toHaveBeenCalled();
  });

  it("limituje liczbę zgłoszeń na stronę", async () => {
    const { reportError, MAX_REPORTS_PER_PAGE } = await load();
    for (let i = 0; i < MAX_REPORTS_PER_PAGE + 5; i++) await reportError("window.error", new Error(`e${i}`));
    expect(invoke).toHaveBeenCalledTimes(MAX_REPORTS_PER_PAGE);
  });

  it("nigdy nie rzuca, nawet gdy wysyłka się nie uda", async () => {
    invoke.mockRejectedValue(new Error("sieć"));
    const { reportError } = await load();
    await expect(reportError("window.error", new Error("x"))).resolves.toBeUndefined();
  });

  it("obsługuje wartości nie będące Error (np. odrzucony promise z obiektem)", async () => {
    const { reportError } = await load();
    await reportError("unhandledrejection", { code: 42 });
    expect(invoke.mock.calls[0][2].message).toBe('{"code":42}');
  });
});

describe("reportError – przerwane żądania", () => {
  it("AbortError nie jest raportowany", async () => {
    const { reportError } = await load();
    const abort = new DOMException("The user aborted a request.", "AbortError");
    await reportError("toast: x", abort);
    expect(invoke).not.toHaveBeenCalled();
  });
});
