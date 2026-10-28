// __tests__/pages/mail.test.tsx

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({
  query: {} as Record<string, string>,
  replace: vi.fn(async () => true),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), confirm: vi.fn(async () => true) },
  client: {
    listAccounts: vi.fn(async () => []),
    listMessages: vi.fn(async () => []),
  },
}));

vi.mock("next/router", () => ({ useRouter: () => ({ isReady: true, query: h.query, replace: h.replace }) }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ toast: h.toast }) }));
vi.mock("@/components/ui/SEO", () => ({ default: () => null }));
vi.mock("@/lib/mail/client", () => ({ createMailClient: () => h.client }));

import MailPage from "@/pages/mail";

beforeEach(() => {
  h.query = {};
  h.replace.mockClear();
  Object.values(h.toast).forEach((fn) => fn.mockClear());
});

describe("strona /mail", () => {
  it("ma nagłówek strony i zachęca do podłączenia konta", async () => {
    render(<MailPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Poczta" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Podłącz konto Gmail lub Outlook.")).toBeInTheDocument());
    expect(screen.getByText(/Brak kont pocztowych do wyświetlenia/)).toBeInTheDocument();
  });

  it("po połączeniu Gmaila pokazuje sukces i czyści parametry adresu", async () => {
    h.query = { connected: "gmail" };
    render(<MailPage />);
    await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith("Konto Gmail zostało podłączone."));
    expect(h.replace).toHaveBeenCalledWith("/mail", undefined, { shallow: true });
  });

  it("błąd połączenia pokazuje komunikat błędu", async () => {
    h.query = { error: "limit" };
    render(<MailPage />);
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith("Osiągnięto limit kont pocztowych."));
  });
});
