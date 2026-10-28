// __tests__/lib/server/mailInlineImages.test.ts

import { describe, it, expect, vi } from "vitest";
import { inlineImageDataUris } from "@/lib/server/mailInlineImages";
import type { MailMessage } from "@/lib/mail/types";

const base: MailMessage = {
  id: "m1",
  threadId: "t1",
  subject: "",
  from: "",
  to: "",
  date: null,
  messageId: null,
  references: null,
  text: "",
  html: "<img src='cid:a'>",
  attachments: [],
  inlineImages: [],
};

describe("inlineImageDataUris", () => {
  it("zamienia obrazy osadzone na data:, pomija SVG i zbyt duże", async () => {
    const getAttachmentBase64 = vi.fn(async (_m: string, id: string) =>
      id === "big" ? "A".repeat(2_000_001) : "iVBORw0K"
    );
    const client = { getAttachmentBase64 } as never;
    const out = await inlineImageDataUris(client, {
      ...base,
      inlineImages: [
        { contentId: "a", attachmentId: "ok", mimeType: "image/png" },
        { contentId: "s", attachmentId: "svg", mimeType: "image/svg+xml" },
        { contentId: "b", attachmentId: "big", mimeType: "image/jpeg" },
      ],
    });
    expect(out).toEqual({ a: "data:image/png;base64,iVBORw0K" });
    expect(getAttachmentBase64).not.toHaveBeenCalledWith("m1", "svg");
  });

  it("błąd pobrania jednego obrazu nie przerywa pozostałych", async () => {
    const client = {
      getAttachmentBase64: vi.fn(async (_m: string, id: string) => {
        if (id === "x") throw new Error("403");
        return "R0lG";
      }),
    } as never;
    const out = await inlineImageDataUris(client, {
      ...base,
      inlineImages: [
        { contentId: "x", attachmentId: "x", mimeType: "image/gif" },
        { contentId: "y", attachmentId: "y", mimeType: "image/gif" },
      ],
    });
    expect(out).toEqual({ y: "data:image/gif;base64,R0lG" });
  });
});
