// __tests__/components/ToastErrorCause.test.tsx

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";

const reportError = vi.fn();
vi.mock("@/lib/errorReport", () => ({ reportError: (...args: unknown[]) => reportError(...args) }));

import { ToastProvider, useToast } from "@/providers/ToastProvider";

let api: ReturnType<typeof useToast>["toast"] | null = null;
function Probe() {
  api = useToast().toast;
  return null;
}

beforeEach(() => {
  reportError.mockReset();
  api = null;
});

describe("toast.error z przyczyną", () => {
  it("bez przyczyny nic nie raportuje (zwykły komunikat dla użytkownika)", () => {
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>
    );
    act(() => api?.error("Coś poszło nie tak."));
    expect(reportError).not.toHaveBeenCalled();
  });

  it("z przyczyną raportuje błąd z kontekstem toast i pokazuje ten sam komunikat", () => {
    const cause = new Error("permission denied");
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>
    );
    act(() => api?.error("Nie udało się zapisać.", { cause }));
    expect(reportError).toHaveBeenCalledWith("toast: Nie udało się zapisać.", cause);
  });
});
