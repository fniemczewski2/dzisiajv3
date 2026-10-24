import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { linkifyText } from "@/lib/noteFormatting";

describe("linkifyText", () => {
  it("zamienia adres w tekście na link otwierany w nowej karcie", () => {
    render(<p>{linkifyText("Dołącz: https://zoom.us/j/123, do zobaczenia", "t")}</p>);
    const link = screen.getByRole("link", { name: "zoom.us/j/123" });
    expect(link).toHaveAttribute("href", "https://zoom.us/j/123");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("nie zjada przecinka po adresie i zostawia resztę tekstu", () => {
    const { container } = render(<p>{linkifyText("Link https://a.pl/x, koniec", "t")}</p>);
    expect(container.textContent).toBe("Link a.pl/x, koniec");
  });

  it("rozpoznaje www i domenę bez schematu", () => {
    render(<p>{linkifyText("www.example.com oraz teams.microsoft.com/l/meet", "t")}</p>);
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("nie tworzy linków z niebezpiecznych schematów ani ze zwykłego tekstu", () => {
    render(<p>{linkifyText("javascript:alert(1) oraz Sala 3.B", "t")}</p>);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("nie przetwarza znaczników pogrubienia (to funkcja notatek)", () => {
    const { container } = render(<p>{linkifyText("**ważne** https://a.pl", "t")}</p>);
    expect(container.querySelector("strong")).toBeNull();
    expect(container.textContent).toContain("**ważne**");
  });

  it("zwraca null dla pustego tekstu", () => {
    expect(linkifyText("", "t")).toBeNull();
  });
});
