// __tests__/config/slack.test.ts

import { describe, it, expect } from "vitest";
import { parseAssigneeEmails } from "@/config/slack";

describe("parseAssigneeEmails", () => {
  it("accepts plausible emails separated by comma, semicolon, space or newline", () => {
    expect(parseAssigneeEmails("a@example.com, b@example.com;c@example.com\nd@example.com")).toEqual([
      "a@example.com",
      "b@example.com",
      "c@example.com",
      "d@example.com",
    ]);
  });

  it("lowercases and dedupes", () => {
    expect(parseAssigneeEmails("A@Example.com, a@example.com")).toEqual(["a@example.com"]);
  });

  it("rejects a chunk with no @", () => {
    expect(parseAssigneeEmails("not-an-email")).toEqual([]);
  });

  it("rejects a chunk with more than one @", () => {
    expect(parseAssigneeEmails("a@b@example.com")).toEqual([]);
  });

  it("rejects an empty local part", () => {
    expect(parseAssigneeEmails("@example.com")).toEqual([]);
  });

  it("rejects a domain with no dot", () => {
    expect(parseAssigneeEmails("a@example")).toEqual([]);
  });

  it("rejects a domain with a leading or trailing dot", () => {
    expect(parseAssigneeEmails("a@.example.com")).toEqual([]);
    expect(parseAssigneeEmails("a@example.com.")).toEqual([]);
  });

  it("accepts a multi-label domain", () => {
    expect(parseAssigneeEmails("a@sub.example.co.uk")).toEqual(["a@sub.example.co.uk"]);
  });
});
