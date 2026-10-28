// __tests__/components/MailBody.test.tsx

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MailBody from "@/components/mail/MailBody";

describe("MailBody", () => {
  it("HTML trafia do ramki sandbox bez uprawnienia do skryptów", () => {
    render(<MailBody html="<p>Witaj</p>" text="Witaj" keyPrefix="m1" />);
    const frame = screen.getByTitle("Treść wiadomości");
    const sandbox = frame.getAttribute("sandbox") ?? "";
    expect(sandbox).not.toContain("allow-scripts");
    expect(sandbox).toContain("allow-popups-to-escape-sandbox");
    expect(frame.getAttribute("srcdoc")).toContain("<p>Witaj</p>");
  });

  it("zdalne obrazy są ukryte do czasu kliknięcia „Pokaż obrazy”", () => {
    render(<MailBody html='<img src="https://cdn.example/a.png">' text="" keyPrefix="m1" />);
    const frame = screen.getByTitle("Treść wiadomości");
    expect(frame.getAttribute("srcdoc")).not.toContain("/api/mail/image");
    fireEvent.click(screen.getByRole("button", { name: "Pokaż obrazy" }));
    expect(screen.getByTitle("Treść wiadomości").getAttribute("srcdoc")).toContain("/api/mail/image?u=");
    expect(screen.queryByRole("button", { name: "Pokaż obrazy" })).toBeNull();
  });

  it("wiadomość tekstowa ma klikalne linki", () => {
    render(<MailBody html={null} text="Szczegóły: https://docs.example.com/spec" keyPrefix="m1" />);
    expect(screen.getByRole("link", { name: "docs.example.com/spec" })).toHaveAttribute(
      "href",
      "https://docs.example.com/spec"
    );
  });
});
