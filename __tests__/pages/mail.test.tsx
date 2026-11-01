// __tests__/pages/mail.test.tsx

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const h = vi.hoisted(() => ({
  query: {} as Record<string, string>,
  replace: vi.fn(async () => true),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), confirm: vi.fn(async () => true) },
  client: {
    listAccounts: vi.fn(async () => [] as unknown[]),
    listMessages: vi.fn(async (_acc: string, _q?: string) => [] as unknown[]),
    getMessage: vi.fn(),
    listForwarding: vi.fn(async () => []),
    listInbox: vi.fn(async () => []),
  },
}));

vi.mock("next/router", () => ({ useRouter: () => ({ isReady: true, query: h.query, replace: h.replace }) }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ toast: h.toast }) }));
vi.mock("@/components/ui/SEO", () => ({ default: () => null }));
vi.mock("@/hooks/useResponsive", () => ({ useResponsive: () => false }));
vi.mock("@/lib/mail/client", () => ({ createMailClient: () => h.client }));

import MailPage from "@/pages/mail";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MailPage />
    </QueryClientProvider>
  );
}

const account = (id: string, email: string) => ({
  id,
  provider: "gmail" as const,
  email,
  createdAt: "2026-10-01T00:00:00Z",
  canDeleteInMailbox: true,
});

beforeEach(() => {
  h.query = {};
  h.replace.mockClear();
  Object.values(h.toast).forEach((fn) => fn.mockClear());
  h.client.listAccounts.mockResolvedValue([]);
  h.client.listMessages.mockClear().mockResolvedValue([]);
});

describe("strona /mail", () => {
  it("ma nagłówek strony i zachęca do podłączenia konta", async () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Poczta" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Podłącz konto Gmail lub Outlook.")).toBeInTheDocument());
  });

  it("po połączeniu Gmaila pokazuje sukces i czyści parametry adresu", async () => {
    h.query = { connected: "gmail" };
    renderPage();
    await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith("Konto Gmail zostało podłączone."));
    expect(h.replace).toHaveBeenCalledWith("/mail", undefined, { shallow: true });
  });

  it("wyszukiwanie na drugim koncie nie przełącza na pierwsze i pobiera listę raz na frazę", async () => {
    h.client.listAccounts.mockResolvedValue([account("a1", "pierwsze@x.pl"), account("a2", "drugie@x.pl")]);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "drugie@x.pl (Gmail)" }));
    await waitFor(() => expect(h.client.listMessages).toHaveBeenCalledWith("a2", ""));
    h.client.listMessages.mockClear();

    fireEvent.change(screen.getByPlaceholderText("Szukaj w poczcie…"), { target: { value: "faktura" } });
    await waitFor(() => expect(h.client.listMessages).toHaveBeenCalledWith("a2", "faktura"), { timeout: 2000 });
    expect(h.client.listMessages).toHaveBeenCalledTimes(1);
    expect(h.client.listMessages).not.toHaveBeenCalledWith("a1", expect.anything());
    expect(h.client.listAccounts).toHaveBeenCalledTimes(1);
  });
});
