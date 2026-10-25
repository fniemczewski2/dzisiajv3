// __tests__/components/ErrorBoundaryReport.test.tsx

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const reportError = vi.fn();
vi.mock("@/lib/errorReport", () => ({ reportError: (...args: unknown[]) => reportError(...args) }));

import ErrorBoundary from "@/components/ui/ErrorBoundary";

function Boom(): React.ReactNode {
  throw new Error("kaboom");
}

describe("ErrorBoundary – raportowanie", () => {
  it("zgłasza przechwycony błąd komponentu z kontekstem ErrorBoundary", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(reportError).toHaveBeenCalledWith("ErrorBoundary", expect.objectContaining({ message: "kaboom" }));
    consoleSpy.mockRestore();
  });
});
