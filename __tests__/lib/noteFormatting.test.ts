// __tests__/lib/noteFormatting.test.ts

import { describe, it, expect } from "vitest";
import { parseNoteLine, groupNoteLines } from "@/lib/noteFormatting";

describe("parseNoteLine", () => {
  it("recognizes a bullet line", () => {
    expect(parseNoteLine("- milk")).toEqual({ kind: "bullet", content: "milk" });
  });

  it("recognizes a numbered line", () => {
    expect(parseNoteLine("2. bread")).toEqual({ kind: "number", content: "bread" });
  });

  it("treats everything else as plain text", () => {
    expect(parseNoteLine("just a note")).toEqual({ kind: "text", content: "just a note" });
  });

  it("does not treat a decimal number as a list marker", () => {
    expect(parseNoteLine("3.5 kg mąki")).toEqual({ kind: "text", content: "3.5 kg mąki" });
  });
});

describe("groupNoteLines", () => {
  it("merges consecutive bullet lines into one block", () => {
    const blocks = groupNoteLines(["- milk", "- bread", "eggs"]);
    expect(blocks).toEqual([
      { kind: "bullet", lines: ["milk", "bread"] },
      { kind: "text", lines: ["eggs"] },
    ]);
  });

  it("keeps consecutive plain text lines as separate blocks", () => {
    const blocks = groupNoteLines(["line one", "line two"]);
    expect(blocks).toEqual([
      { kind: "text", lines: ["line one"] },
      { kind: "text", lines: ["line two"] },
    ]);
  });

  it("does not merge a bullet block into a following numbered block", () => {
    const blocks = groupNoteLines(["- milk", "1. bread"]);
    expect(blocks).toEqual([
      { kind: "bullet", lines: ["milk"] },
      { kind: "number", lines: ["bread"] },
    ]);
  });
});
