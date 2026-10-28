// __tests__/lib/mail/outlook.test.ts

import { describe, it, expect, vi } from "vitest";
import { createOutlookClient, formatGraphAddress, GraphApiError, decodeBase64Utf8 } from "@/lib/mail/outlook";
import { buildMicrosoftMailAuthUrl, graphProfileEmail } from "@/lib/mail/outlookAuth";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("formatGraphAddress", () => {
  it("łączy nazwę z adresem", () => {
    expect(formatGraphAddress({ emailAddress: { name: "Anna", address: "anna@x.pl" } })).toBe("Anna <anna@x.pl>");
  });
  it("bez nazwy zwraca sam adres, bez adresu pusty ciąg", () => {
    expect(formatGraphAddress({ emailAddress: { address: "a@x.pl" } })).toBe("a@x.pl");
    expect(formatGraphAddress(undefined)).toBe("");
  });
});

describe("decodeBase64Utf8", () => {
  it("odkodowuje polskie znaki", () => {
    expect(decodeBase64Utf8(Buffer.from("Zażółć", "utf8").toString("base64"))).toBe("Zażółć");
  });
});

describe("createOutlookClient", () => {
  it("listRecent mapuje wiadomości z Graph i wysyła token", async () => {
    const fetchMock = vi.fn(async () =>
      json({
        value: [
          {
            id: "m1",
            conversationId: "c1",
            subject: "Faktura",
            from: { emailAddress: { name: "Jan", address: "jan@x.pl" } },
            toRecipients: [{ emailAddress: { address: "ja@y.pl" } }],
            receivedDateTime: "2026-10-26T10:00:00Z",
            internetMessageId: "<m1@x.pl>",
            hasAttachments: false,
          },
        ],
      })
    );
    const msgs = await createOutlookClient("T", fetchMock).listRecent(5);
    expect(msgs).toEqual([
      expect.objectContaining({
        id: "m1",
        threadId: "c1",
        subject: "Faktura",
        from: "Jan <jan@x.pl>",
        to: "ja@y.pl",
        messageId: "<m1@x.pl>",
      }),
    ]);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/me/mailFolders/inbox/messages?$top=5");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer T");
  });

  it("getMessage pobiera treść tekstową i metadane załączników", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          id: "m2",
          conversationId: "c2",
          subject: "S",
          from: {},
          hasAttachments: true,
          body: { content: "Treść" },
        })
      )
      .mockResolvedValueOnce(
        json({
          value: [
            {
              id: "a1",
              name: "invite.ics",
              contentType: "text/calendar",
              "@odata.type": "#microsoft.graph.fileAttachment",
            },
            { id: "a2", name: "ref", "@odata.type": "#microsoft.graph.referenceAttachment" },
          ],
        })
      );
    const msg = await createOutlookClient("T", fetchMock as unknown as typeof fetch).getMessage("m2");
    expect(msg.text).toBe("Treść");
    expect(msg.html).toBeNull();
    expect(msg.attachments).toEqual([{ attachmentId: "a1", filename: "invite.ics", mimeType: "text/calendar" }]);
  });

  it("replyTo wysyła komentarz do endpointu reply", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
    await createOutlookClient("T", fetchMock).replyTo("m1", "Dziękuję");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.endsWith("/me/messages/m1/reply")).toBe(true);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ comment: "Dziękuję" });
  });

  it("błąd HTTP rzuca GraphApiError z kodem", async () => {
    const client = createOutlookClient("T", async () => new Response("{}", { status: 403 }));
    await expect(client.listRecent(1)).rejects.toBeInstanceOf(GraphApiError);
    await expect(client.listRecent(1)).rejects.toMatchObject({ status: 403 });
  });
});

describe("outlookAuth", () => {
  it("adres autoryzacji zawiera zakresy poczty i wymusza wybór konta", () => {
    const url = new URL(buildMicrosoftMailAuthUrl({ clientId: "c", redirectUri: "https://x/cb", state: "n" }));
    expect(url.searchParams.get("scope")).toContain("Mail.Send");
    expect(url.searchParams.get("scope")).toContain("offline_access");
    expect(url.searchParams.get("prompt")).toBe("select_account");
    expect(url.searchParams.get("state")).toBe("n");
  });
  it("adres konta: mail, a gdy brak – userPrincipalName", () => {
    expect(graphProfileEmail({ mail: "A@X.pl" })).toBe("A@X.pl");
    expect(graphProfileEmail({ mail: null, userPrincipalName: "u@tenant.onmicrosoft.com" })).toBe(
      "u@tenant.onmicrosoft.com"
    );
    expect(graphProfileEmail({})).toBeNull();
  });
});

describe("createOutlookClient.trashMessage", () => {
  it("przenosi do „Elementów usuniętych”", async () => {
    const fetchMock = vi.fn(async () => json({ id: "m1-moved" }, 201));
    await createOutlookClient("T", fetchMock).trashMessage("m1");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.endsWith("/me/messages/m1/move")).toBe(true);
    expect(JSON.parse(init.body as string)).toEqual({ destinationId: "deleteditems" });
  });
});
