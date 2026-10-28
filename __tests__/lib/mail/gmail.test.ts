// __tests__/lib/mail/gmail.test.ts

import { describe, it, expect, vi } from "vitest";
import { createGmailClient, decodeBase64Url, GmailApiError, parseGmailMessage } from "@/lib/mail/gmail";
import { utf8ToBase64 } from "@/lib/mail/reply";

const b64url = (s: string) => utf8ToBase64(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const RAW = {
  id: "m1",
  threadId: "t1",
  payload: {
    mimeType: "multipart/mixed",
    headers: [
      { name: "Subject", value: "Spotkanie" },
      { name: "From", value: "Anna <anna@example.com>" },
      { name: "To", value: "ja@x.pl" },
      { name: "Message-ID", value: "<m1@example.com>" },
    ],
    parts: [
      { mimeType: "text/plain", body: { data: b64url("Zapraszam na rozmowę.") } },
      { mimeType: "text/calendar", filename: "invite.ics", body: { attachmentId: "att1" } },
    ],
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("decodeBase64Url", () => {
  it("odkodowuje polskie znaki", () => {
    expect(decodeBase64Url(b64url("Zażółć gęślą jaźń"))).toBe("Zażółć gęślą jaźń");
  });
});

describe("parseGmailMessage", () => {
  it("wyciąga nagłówki, treść text/plain i metadane załączników", () => {
    const msg = parseGmailMessage(RAW);
    expect(msg).toMatchObject({
      id: "m1",
      threadId: "t1",
      subject: "Spotkanie",
      from: "Anna <anna@example.com>",
      messageId: "<m1@example.com>",
      text: "Zapraszam na rozmowę.",
    });
    expect(msg.attachments).toEqual([{ attachmentId: "att1", filename: "invite.ics", mimeType: "text/calendar" }]);
  });
});

describe("createGmailClient", () => {
  it("wysyła token w nagłówku Authorization", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ messages: [{ id: "m1" }] }));
    const client = createGmailClient("TOKEN", fetchMock);
    const ids = await client.listMessageIds(5, "is:unread");
    expect(ids).toEqual(["m1"]);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("maxResults=5");
    expect(url).toContain("q=is%3Aunread");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer TOKEN");
  });

  it("getMessage zwraca sparsowaną wiadomość", async () => {
    const client = createGmailClient("T", async () => jsonResponse(RAW));
    expect((await client.getMessage("m1")).subject).toBe("Spotkanie");
  });

  it("getAttachmentText odkodowuje treść załącznika", async () => {
    const client = createGmailClient("T", async () => jsonResponse({ data: b64url("BEGIN:VCALENDAR") }));
    expect(await client.getAttachmentText("m1", "att1")).toBe("BEGIN:VCALENDAR");
  });

  it("sendReply wysyła POST z raw i threadId", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "sent1" }));
    const client = createGmailClient("T", fetchMock);
    await client.sendReply({ raw: "abc", threadId: "t1" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.endsWith("/messages/send")).toBe(true);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ raw: "abc", threadId: "t1" });
  });

  it("błąd HTTP rzuca GmailApiError z kodem statusu", async () => {
    const client = createGmailClient("T", async () => new Response("{}", { status: 403 }));
    await expect(client.getMessage("m1")).rejects.toMatchObject({ status: 403 });
    await expect(client.getMessage("m1")).rejects.toBeInstanceOf(GmailApiError);
  });
});

describe("createGmailClient – lista z samych nagłówków", () => {
  it("getMessageSummary prosi o format=metadata i wybrane nagłówki", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ id: "m1", threadId: "t1", payload: { headers: RAW.payload.headers } })
    );
    const msg = await createGmailClient("T", fetchMock).getMessageSummary("m1");
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain("format=metadata");
    expect(url).toContain("metadataHeaders=Subject");
    expect(msg).toMatchObject({ subject: "Spotkanie", text: "", attachments: [] });
  });
});

describe("parseGmailMessage – HTML i obrazy osadzone", () => {
  it("rozpoznaje część text/html i obraz z Content-ID; bez text/plain tekst powstaje z HTML", () => {
    const msg = parseGmailMessage({
      id: "m3",
      threadId: "t3",
      payload: {
        mimeType: "multipart/related",
        headers: [{ name: "Subject", value: "Newsletter" }],
        parts: [
          {
            mimeType: "text/html",
            body: { data: b64url('<p>Witaj <a href="https://a.pl">tu</a></p><img src="cid:logo">') },
          },
          {
            mimeType: "image/png",
            filename: "logo.png",
            headers: [{ name: "Content-ID", value: "<logo>" }],
            body: { attachmentId: "img1" },
          },
        ],
      },
    });
    expect(msg.html).toContain('src="cid:logo"');
    expect(msg.inlineImages).toEqual([{ contentId: "logo", attachmentId: "img1", mimeType: "image/png" }]);
    expect(msg.attachments).toEqual([]);
    expect(msg.text).toContain("Witaj tu https://a.pl");
  });
});

describe("createGmailClient.trashMessage", () => {
  it("przenosi do kosza endpointem /trash (bez trwałego usuwania)", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "m1" }));
    await createGmailClient("T", fetchMock).trashMessage("m1");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.endsWith("/messages/m1/trash")).toBe(true);
    expect(init.method).toBe("POST");
  });
});
