// __tests__/lib/mail/client.test.ts

import { describe, it, expect, vi } from "vitest";
import { createMailClient, MailApiError } from "@/lib/mail/client";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("createMailClient", () => {
  it("odpowiedź wysyła wyłącznie z confirm: true i treścią", async () => {
    const fetchMock = vi.fn(async () => json({ sentId: "s1" }));
    const client = createMailClient(fetchMock);
    await client.sendReply({ accountId: "a1", messageId: "m1", body: "Dzień dobry" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/mail/reply");
    expect(JSON.parse(init.body as string)).toEqual({
      accountId: "a1",
      messageId: "m1",
      body: "Dzień dobry",
      confirm: true,
    });
  });

  it("błąd HTTP zwraca MailApiError z komunikatem serwera", async () => {
    const client = createMailClient(async () => json({ error: "Za dużo wysłanych wiadomości." }, 429));
    await expect(client.sendReply({ accountId: "a", messageId: "m", body: "x" })).rejects.toMatchObject({
      status: 429,
      message: "Za dużo wysłanych wiadomości.",
    });
    await expect(client.sendReply({ accountId: "a", messageId: "m", body: "x" })).rejects.toBeInstanceOf(MailApiError);
  });

  it("błąd bez JSON-a daje ogólny komunikat", async () => {
    const client = createMailClient(async () => new Response("<html>", { status: 500 }));
    await expect(client.listAccounts()).rejects.toMatchObject({ status: 500, message: "Błąd serwera." });
  });

  it("odłączenie (204) nie próbuje czytać ciała", async () => {
    const client = createMailClient(async () => new Response(null, { status: 204 }));
    await expect(client.disconnect("a1")).resolves.toBeUndefined();
  });

  it("identyfikatory w adresie są kodowane", async () => {
    const fetchMock = vi.fn(async () => json({ messages: [] }));
    await createMailClient(fetchMock).listMessages("a 1&x");
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toContain("accountId=a%201%26x");
  });
});

describe("createMailClient – przekierowania", () => {
  it("utworzenie adresu wysyła nazwę i zwraca adres", async () => {
    const fetchMock = vi.fn(async () => json({ id: "f1", address: "p-x@d", note: "n" }, 201));
    const out = await createMailClient(fetchMock).createForwarding("Praca");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/mail/forwarding");
    expect(JSON.parse(init.body as string)).toEqual({ label: "Praca" });
    expect(out.address).toBe("p-x@d");
  });

  it("odwołanie używa DELETE z identyfikatorem", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    await createMailClient(fetchMock).revokeForwarding("f 1");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/mail/forwarding?id=f%201");
    expect(init.method).toBe("DELETE");
  });

  it("akcja na skrzynce wysyła id i rodzaj", async () => {
    const fetchMock = vi.fn(async () => json({ taskId: "t1" }, 201));
    await createMailClient(fetchMock).inboxAction("i1", "task");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/mail/inbox/action");
    expect(JSON.parse(init.body as string)).toEqual({ id: "i1", action: "task" });
  });
});

describe("createMailClient – Outlook", () => {
  it("startOutlookConnection pobiera adres autoryzacji Microsoft", async () => {
    const fetchMock = vi.fn(async () => json({ url: "https://login.microsoftonline.com/x" }));
    const url = await createMailClient(fetchMock).startOutlookConnection();
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe("/api/mail/outlook");
    expect(url).toContain("login.microsoftonline.com");
  });
});
