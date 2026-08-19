// __tests__/components/LetterFileSlot.test.tsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileSlot } from "@/components/letters/LetterList";

const getLetterFileUrl = vi.fn();
const uploadLetterFile = vi.fn();

vi.mock("@/hooks/db/useLetters", () => ({
  useLetters: () => ({ uploadLetterFile, getLetterFileUrl }),
}));

describe("FileSlot preview (regression: noopener/noreferrer nulling window.open)", () => {
  beforeEach(() => {
    getLetterFileUrl.mockReset();
    uploadLetterFile.mockReset();
  });

  it("opens the tab BEFORE awaiting the signed URL, without noopener/noreferrer (which would make window.open return null)", async () => {
    const fakeWindow = { location: { href: "" }, close: vi.fn(), opener: "something" };
    const openSpy = vi.spyOn(window, "open").mockReturnValue(fakeWindow as unknown as Window);
    getLetterFileUrl.mockResolvedValue("https://example.supabase.co/storage/v1/object/sign/letters/foo.pdf?token=abc");

    render(
      <FileSlot label="Pismo" path="user/letter.pdf" letterId="letter-1" category="UDIP" kind="letter" />
    );

    await userEvent.click(screen.getByRole("button", { name: /podgląd/i }));

    // The regression: passing "noopener"/"noreferrer" makes window.open()
    // return null, so there is nothing to navigate once the signed URL
    // resolves. Assert the call has no third (features) argument doing that.
    expect(openSpy).toHaveBeenCalledWith("", "_blank");
    expect(fakeWindow.location.href).toBe(
      "https://example.supabase.co/storage/v1/object/sign/letters/foo.pdf?token=abc"
    );
    expect(fakeWindow.opener).toBeNull();
  });

  it("closes the opened tab if no URL comes back", async () => {
    const fakeWindow = { location: { href: "" }, close: vi.fn(), opener: null };
    vi.spyOn(window, "open").mockReturnValue(fakeWindow as unknown as Window);
    getLetterFileUrl.mockResolvedValue(null);

    render(
      <FileSlot label="Pismo" path="user/letter.pdf" letterId="letter-1" category="UDIP" kind="letter" />
    );

    await userEvent.click(screen.getByRole("button", { name: /podgląd/i }));

    expect(fakeWindow.close).toHaveBeenCalled();
  });
});
