// __tests__/lib/mail/deleteFlow.test.ts

import { describe, it, expect, vi } from "vitest";
import { askDeleteMode } from "@/lib/mail/deleteFlow";

const params = { subject: "Faktura", provider: "gmail" as const, canDeleteInMailbox: true };

describe("askDeleteMode", () => {
  it("Anuluj w pierwszym kroku: bez zmian i bez drugiego pytania", async () => {
    const confirm = vi.fn(async () => false);
    expect(await askDeleteMode(confirm, params)).toBe("cancel");
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("„Także w poczcie” → kosz w skrzynce", async () => {
    const confirm = vi.fn(async () => true);
    expect(await askDeleteMode(confirm, params)).toBe("mailbox");
    expect(confirm).toHaveBeenNthCalledWith(1, "Usunąć wiadomość „Faktura” z aplikacji?", {
      confirmLabel: "Usuń",
      cancelLabel: "Anuluj",
    });
    expect(confirm).toHaveBeenNthCalledWith(2, expect.stringContaining("do kosza w Gmailu"), {
      confirmLabel: "Także w poczcie",
      cancelLabel: "Tylko z aplikacji",
    });
  });

  it("„Tylko z aplikacji” (lub zamknięcie) → skrzynka bez zmian", async () => {
    const confirm = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await askDeleteMode(confirm, params)).toBe("app");
  });

  it("bez uprawnień do kosza drugi krok jest pomijany", async () => {
    const confirm = vi.fn(async () => true);
    expect(await askDeleteMode(confirm, { ...params, canDeleteInMailbox: false })).toBe("app");
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("Outlook i pusty temat", async () => {
    const confirm = vi.fn(async () => true);
    await askDeleteMode(confirm, { subject: "  ", provider: "outlook", canDeleteInMailbox: true });
    expect(confirm).toHaveBeenNthCalledWith(1, "Usunąć wiadomość „bez tematu” z aplikacji?", expect.anything());
    expect(confirm).toHaveBeenNthCalledWith(2, expect.stringContaining("w Outlooku"), expect.anything());
  });
});
