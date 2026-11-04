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
    fireEvent.click(await screen.findByRole("button", { name: "Konta" }));
    fireEvent.click(await screen.findByRole("button", { name: "drugie@x.pl (Gmail)" }));
    await waitFor(() => expect(h.client.listMessages).toHaveBeenCalledWith("a2", ""));
    h.client.listMessages.mockClear();

    fireEvent.change(screen.getByPlaceholderText("Szukaj w poczcie…"), { target: { value: "faktura" } });
    await waitFor(() => expect(h.client.listMessages).toHaveBeenCalledWith("a2", "faktura"), { timeout: 2000 });
    expect(h.client.listMessages).toHaveBeenCalledTimes(1);
    expect(h.client.listMessages).not.toHaveBeenCalledWith("a1", expect.anything());
    expect(h.client.listAccounts).toHaveBeenCalledTimes(1);
  });

  describe("widok wspólny (Wszystkie)", () => {
    const summary = (id: string, subject: string, from: string, date: string) => ({
      id,
      threadId: `t-${id}`,
      subject,
      from,
      date,
    });
    const forwarded = {
      id: "i1",
      from: "Fundacja <f@x.pl>",
      subject: "Przekierowany",
      text: "treść listu",
      html: null,
      receivedAt: "2026-11-03T12:00:00Z",
      expiresAt: "2026-11-06T12:00:00Z",
      invitation: null,
    };

    beforeEach(() => {
      h.client.listAccounts.mockResolvedValue([account("a1", "pierwsze@x.pl"), account("a2", "drugie@x.pl")]);
      h.client.listMessages.mockImplementation(async (id: string) =>
        id === "a1"
          ? [summary("m1", "Faktura", "Biuro <biuro@x.pl>", "2026-11-02T10:00:00Z")]
          : [summary("m2", "Zaproszenie", "Jan <jan@x.pl>", "2026-11-03T09:00:00Z")]
      );
      h.client.listInbox.mockResolvedValue([forwarded] as never);
    });

    it("jest domyślny: wiadomości wszystkich kont i przekierowane w jednej liście, od najnowszych, z etykietą źródła", async () => {
      renderPage();
      const list = await screen.findByRole("list", { name: "Wszystkie wiadomości" });
      await waitFor(() => expect(list.querySelectorAll(":scope > li")).toHaveLength(3));
      const rows = [...list.querySelectorAll(":scope > li")].map((li) => li.textContent ?? "");
      expect(rows[0]).toContain("Przekierowany");
      expect(rows[0]).toContain("Przekierowanie");
      expect(rows[1]).toContain("Zaproszenie");
      expect(rows[1]).toContain("drugie@x.pl");
      expect(rows[2]).toContain("Faktura");
      expect(rows[2]).toContain("pierwsze@x.pl");
      expect(screen.getByRole("button", { name: "Wszystkie" })).toHaveAttribute("aria-pressed", "true");
    });

    it("otwarcie wiadomości pobiera ją z konta, z którego pochodzi", async () => {
      h.client.getMessage.mockResolvedValue({
        message: {
          id: "m2",
          threadId: "t-m2",
          subject: "Zaproszenie",
          from: "Jan <jan@x.pl>",
          to: "",
          date: null,
          text: "treść",
          html: null,
          attachments: [],
          inlineImages: {},
        },
        invitation: null,
      });
      renderPage();
      fireEvent.click(await screen.findByRole("button", { name: /^(?!Usuń).*Zaproszenie/ }));
      await waitFor(() => expect(h.client.getMessage).toHaveBeenCalledWith("a2", "m2"));
      expect(h.client.getMessage).not.toHaveBeenCalledWith("a1", expect.anything());
    });

    it("wyszukiwanie: fraza trafia do dostawcy dla każdego konta, a przekierowane są filtrowane lokalnie", async () => {
      renderPage();
      await screen.findByRole("list", { name: "Wszystkie wiadomości" });
      h.client.listMessages.mockClear();
      fireEvent.change(screen.getByPlaceholderText("Szukaj we wszystkich skrzynkach…"), {
        target: { value: "faktura" },
      });
      await waitFor(() => expect(h.client.listMessages).toHaveBeenCalledWith("a1", "faktura"), { timeout: 2000 });
      expect(h.client.listMessages).toHaveBeenCalledWith("a2", "faktura");
      expect(screen.queryByText("Przekierowany")).toBeNull();
    });

    it("przełącznik „Przekierowania” pokazuje panel adresów, „Konta” panel kont", async () => {
      renderPage();
      fireEvent.click(await screen.findByRole("button", { name: "Przekierowania" }));
      expect(await screen.findByPlaceholderText("Szukaj w przekierowanych…")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Konta" }));
      expect(await screen.findByPlaceholderText("Szukaj w poczcie…")).toBeInTheDocument();
    });
  });
});
