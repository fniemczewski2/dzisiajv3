import { describe, expect, it, vi } from "vitest";
import { buildAssigneeFilter } from "@/lib/server/slackSync/syncList";
import type { SlackColumn, SlackItem } from "@/lib/server/slackLists";

const columns = [
  { id: "Col_title", name: "Nazwa", type: "text" },
  { id: "Col_owner", name: "Assignee", type: "todo_assignee" },
] as SlackColumn[];

const item = (id: string, users: string[]): SlackItem => ({
  id,
  fields: [{ column_id: "Col_owner", user: users }],
});

describe("buildAssigneeFilter", () => {
  it("bez adresów przepuszcza wszystkie pozycje", async () => {
    const accepts = await buildAssigneeFilter({ token: "t", assigneeEmails: [] }, columns);
    expect(accepts(item("1", []))).toBe(true);
  });

  it("przepuszcza tylko pozycje przypisane do wskazanych osób", async () => {
    const lookup = vi.fn((_t: string, email: string) => Promise.resolve(email === "jan@firma.pl" ? "U_JAN" : null));
    const accepts = await buildAssigneeFilter(
      { token: "t", assigneeEmails: ["jan@firma.pl", "nikt@firma.pl"] },
      columns,
      lookup
    );
    expect(accepts(item("1", ["U_JAN"]))).toBe(true);
    expect(accepts(item("2", ["U_ANNA"]))).toBe(false);
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it("bez kolumny osoby przypisanej nie importuje niczego", async () => {
    const accepts = await buildAssigneeFilter(
      { token: "t", assigneeEmails: ["jan@firma.pl"] },
      [columns[0]],
      () => Promise.resolve("U_JAN")
    );
    expect(accepts(item("1", ["U_JAN"]))).toBe(false);
  });
});
