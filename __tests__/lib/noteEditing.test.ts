// __tests__/lib/noteEditing.test.ts

import { describe, it, expect } from "vitest";
import { applyBold, toggleListPrefix, continueListOnEnter } from "@/lib/noteEditing";

describe("applyBold", () => {
  it("wraps a selection in ** markers", () => {
    const result = applyBold({ value: "hello world", start: 0, end: 5 });
    expect(result.value).toBe("**hello** world");
    expect(result.start).toBe(0);
    expect(result.end).toBe(9);
  });

  it("unwraps an already-bold selection", () => {
    const result = applyBold({ value: "**hello** world", start: 0, end: 9 });
    expect(result.value).toBe("hello world");
  });

  it("inserts a placeholder with no selection", () => {
    const result = applyBold({ value: "", start: 0, end: 0 });
    expect(result.value).toBe("**pogrubienie**");
    expect(result.value.slice(result.start, result.end)).toBe("pogrubienie");
  });
});

describe("toggleListPrefix", () => {
  it("adds a bullet marker to the current line", () => {
    const result = toggleListPrefix({ value: "milk\nbread", start: 0, end: 0 }, "bullet");
    expect(result.value).toBe("- milk\nbread");
  });

  it("removes the bullet marker when toggled again", () => {
    const result = toggleListPrefix({ value: "- milk\nbread", start: 0, end: 4 }, "bullet");
    expect(result.value).toBe("milk\nbread");
  });

  it("numbers a multi-line selection sequentially", () => {
    const value = "milk\nbread\neggs";
    const result = toggleListPrefix({ value, start: 0, end: value.length }, "number");
    expect(result.value).toBe("1. milk\n2. bread\n3. eggs");
  });

  it("switches a bullet line to a numbered line", () => {
    const result = toggleListPrefix({ value: "- milk", start: 0, end: 0 }, "number");
    expect(result.value).toBe("1. milk");
  });
});

describe("continueListOnEnter", () => {
  it.each([
    ["continues a bullet list on a non-empty line", "- milk", "- milk\n- "],
    ["exits list mode when Enter is pressed on an empty bullet", "- milk\n- ", "- milk\n"],
    ["continues a numbered list incrementing the number", "1. milk", "1. milk\n2. "],
  ])("%s", (_name, value, expected) => {
    const result = continueListOnEnter({ value, start: value.length, end: value.length });
    expect(result?.value).toBe(expected);
  });

  it("returns null on a plain text line", () => {
    const value = "just some text";
    const result = continueListOnEnter({ value, start: value.length, end: value.length });
    expect(result).toBeNull();
  });

  it("returns null when the cursor isn't at the end of the line", () => {
    const value = "- milk";
    const result = continueListOnEnter({ value, start: 2, end: 2 });
    expect(result).toBeNull();
  });
});
