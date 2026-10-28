// __tests__/lib/mail/provider.test.ts

import { describe, it, expect, vi } from "vitest";
import { gmailProvider, outlookProvider, ReplyAddressError } from "@/lib/mail/provider";
import type { MailMessage } from "@/lib/mail/types";

const original: MailMessage = {
  id: "m1",
  threadId: "t1",
  subject: "Faktura",
  from: "Jan <jan@x.pl>",
  to: "ja@y.pl",
  date: null,
  messageId: "<m1@x.pl>",
  references: null,
  text: "",
  html: null,
  attachments: [],
  inlineImages: [],
};

describe("gmailProvider.reply", () => {
  it("wysyła odpowiedź w tym samym wątku z poprawnym adresem odbiorcy", async () => {
    const sendReply = vi.fn(async () => ({ id: "sent1" }));
    const client = { sendReply } as never;
    const out = await gmailProvider(client, "ja@y.pl").reply(original, "Dziękuję");
    expect(out).toEqual({ id: "sent1" });
    const [params] = sendReply.mock.calls[0] as unknown as [{ raw: string; threadId: string }];
    expect(params.threadId).toBe("t1");
    expect(params.raw).not.toMatch(/[+/=]/);
  });

  it("nadawca bez adresu daje ReplyAddressError", async () => {
    const client = { sendReply: vi.fn() } as never;
    await expect(gmailProvider(client, "ja@y.pl").reply({ ...original, from: "brak" }, "x")).rejects.toBeInstanceOf(
      ReplyAddressError
    );
  });
});

describe("outlookProvider.reply", () => {
  it("odpowiada przez Graph w wątku i nie zwraca identyfikatora", async () => {
    const replyTo = vi.fn(async () => undefined);
    const out = await outlookProvider({ replyTo } as never).reply(original, "Dziękuję");
    expect(replyTo).toHaveBeenCalledWith("m1", "Dziękuję");
    expect(out).toEqual({ id: null });
  });
});

describe("gmailProvider.listRecent", () => {
  it("pobiera nagłówki zamiast pełnych wiadomości", async () => {
    const client = {
      listMessageIds: vi.fn(async () => ["a", "b"]),
      getMessageSummary: vi.fn(async (id: string) => ({ ...original, id })),
      getMessage: vi.fn(),
    } as never;
    const list = await gmailProvider(client, "ja@y.pl").listRecent(2);
    expect(list.map((m) => m.id)).toEqual(["a", "b"]);
    expect((client as { getMessage: ReturnType<typeof vi.fn> }).getMessage).not.toHaveBeenCalled();
  });
});
