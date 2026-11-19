// __tests__/lib/mentions.test.ts

import { describe, it, expect } from "vitest";
import { findMentions, fromObsidianLinks, obsidianTag, splitMentions, toObsidianLinks } from "@/lib/mentions";
import { pickCandidate } from "@/lib/mentionTargets";

describe("findMentions", () => {
  it("rozpoznaje osoby, zadania i rachunki; podkreślenie = spacja", () => {
    expect(findMentions("Zadzwoń do @Anna_Nowak w sprawie !Wniosek_o_dotację i $Prąd.")).toEqual([
      { kind: "person", name: "Anna Nowak", raw: "@Anna_Nowak", index: 11 },
      { kind: "task", name: "Wniosek o dotację", raw: "!Wniosek_o_dotację", index: 33 },
      { kind: "bill", name: "Prąd", raw: "$Prąd", index: 54 },
    ]);
  });

  it("pomija e-mail, kwotę, wykrzyknik po słowie i osadzenie Obsidiana", () => {
    expect(findMentions("jan@example.pl kosztuje $100, Uwaga!Test, ![[obraz.png]]")).toEqual([]);
  });

  it("splitMentions zachowuje cały tekst", () => {
    const text = "Przed @Jan i po.";
    const joined = splitMentions(text)
      .map((p) => (p.type === "text" ? p.text : p.mention.raw))
      .join("");
    expect(joined).toBe(text);
  });
});

describe("Obsidian", () => {
  it("eksport do [[…]] i powrót przy imporcie", () => {
    const out = toObsidianLinks("Spotkanie z @Anna_Nowak, potem !Raport_roczny");
    expect(out.text).toBe("Spotkanie z [[Anna Nowak]], potem [[Raport roczny]]");
    expect(out.links).toEqual(["osoba:Anna Nowak", "zadanie:Raport roczny"]);
    expect(out.tags).toEqual(["osoba", "zadanie"]);
    expect(fromObsidianLinks(out.text, out.links)).toBe("Spotkanie z @Anna_Nowak, potem !Raport_roczny");
  });

  it("link spoza listy zostaje bez zmian", () => {
    expect(fromObsidianLinks("[[Inna notatka]]", ["osoba:Anna"])).toBe("[[Inna notatka]]");
  });

  it("obsidianTag: bez spacji i samych cyfr", () => {
    expect(obsidianTag("Fundacje Zapłon")).toBe("fundacje-zapłon");
    expect(obsidianTag("2026")).toBeNull();
    expect(obsidianTag("")).toBeNull();
  });
});

describe("pickCandidate", () => {
  it("dokładna nazwa przed prefiksową, niezakończone przed zakończonymi", () => {
    const list = [
      { id: "1", label: "Raport roczny 2025", done: false },
      { id: "2", label: "Raport roczny", done: true },
      { id: "3", label: "raport roczny", done: false },
    ];
    expect(pickCandidate("Raport roczny", list)).toBe("3");
    expect(pickCandidate("Brak", list)).toBeNull();
  });
});
