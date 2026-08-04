// __tests__/lib/server/slackLists.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isMissingItemError,
  listColumns,
  listItems,
  updateItem,
  buildFieldValue,
  buildAssigneeValue,
  findAssigneeColumn,
  readFieldValue,
  type SlackColumn,
} from "@/lib/server/slackLists";
import { normalizeTaskStatus } from "@/config/slack";
import {
  belongsOnList,
  resolveDirection,
  taskUpdatedAt,
  itemUpdatedAt,
} from "@/pages/api/slack/sync";

interface Call {
  url: string;
  method: string;
  body: Record<string, unknown>;
}

const calls: Call[] = [];

function mockSlack(responder: (method: string) => unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const body = init.body
        ? (JSON.parse(String(init.body)) as Record<string, unknown>)
        : {};
      calls.push({ url, method: String(init.method), body });
      const method = url.split("/api/")[1].split("?")[0];
      return {
        status: 200,
        headers: { get: () => null },
        json: async () => responder(method),
      } as unknown as Response;
    })
  );
}

const SCHEMA = [
  { id: "Col001", key: "title", name: "Zadanie", type: "text", is_primary_column: true },
  { id: "Col002", key: "date", name: "Termin", type: "date" },
  {
    id: "Col003",
    key: "status",
    name: "Status",
    type: "select",
    options: {
      choices: [
        { value: "opt_todo", label: "Not Started", color: "red" },
        { value: "opt_done", label: "Completed", color: "green" },
      ],
    },
  },
];

beforeEach(() => {
  calls.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listColumns", () => {
  it("reads the column schema from the list file instead of a non-existent columns endpoint", async () => {
    mockSlack(() => ({ ok: true, file: { list_metadata: { schema: SCHEMA } } }));

    const columns = await listColumns("xoxp-test", "F123");

    expect(calls[0].url).toBe("https://slack.com/api/files.info?file=F123");
    expect(calls[0].method).toBe("GET");
    expect(calls[0].body).toEqual({});
    expect(columns.map((c) => c.id)).toEqual(["Col001", "Col002", "Col003"]);
    expect(columns[1].name).toBe("Termin");
  });

  it("falls back to columns inferred from items when the schema cannot be read", async () => {
    mockSlack((method) => {
      if (method === "files.info") return { ok: false, error: "missing_scope" };
      if (method === "slackLists.items.list") {
        return {
          ok: true,
          items: [
            {
              id: "Rec1",
              fields: [
                { column_id: "Col001", key: "title", text: "Kup mleko" },
                { column_id: "Col002", key: "date", date: ["2026-08-10"] },
              ],
            },
          ],
          response_metadata: { next_cursor: "" },
        };
      }
      return { ok: true };
    });

    const { columns, items } = await listItems("xoxp-test", "F123");

    expect(items).toHaveLength(1);
    expect(columns.map((c) => c.id)).toEqual(["Col001", "Col002"]);
    expect(columns[1].type).toBe("date");
  });
});

describe("listColumns transport", () => {
  it("keeps sending JSON for the modern slackLists.* methods", async () => {
    mockSlack(() => ({ ok: true }));
    await updateItem("xoxp-test", "F123", "Rec1", [{ column_id: "Col1", number: [1] }]);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].url).not.toContain("?");
  });
});

describe("updateItem", () => {
  it("sends row_id inside every cell, as slackLists.items.update requires", async () => {
    mockSlack(() => ({ ok: true }));

    await updateItem("xoxp-test", "F123", "Rec777", [
      { column_id: "Col002", date: ["2026-08-10"] },
    ]);

    expect(calls[0].url).toContain("slackLists.items.update");
    expect(calls[0].body).toEqual({
      list_id: "F123",
      cells: [{ column_id: "Col002", date: ["2026-08-10"], row_id: "Rec777" }],
    });
    expect(calls[0].body).not.toHaveProperty("id");
  });

  it("skips the API call when there is nothing to update", async () => {
    mockSlack(() => ({ ok: true }));
    await updateItem("xoxp-test", "F123", "Rec777", []);
    expect(calls).toHaveLength(0);
  });
});

describe("buildFieldValue", () => {
  const textColumn: SlackColumn = { id: "Col001", name: "Zadanie", type: "text" };
  const dateColumn: SlackColumn = { id: "Col002", name: "Termin", type: "date" };
  const selectColumn: SlackColumn = {
    id: "Col003",
    name: "Status",
    type: "select",
    options: {
      choices: [
        { value: "opt_todo", label: "Not Started" },
        { value: "opt_done", label: "Completed" },
      ],
    },
  };

  it("wraps plain text in a rich_text block", () => {
    expect(buildFieldValue(textColumn, "Kup mleko")).toMatchObject({
      column_id: "Col001",
      rich_text: [{ type: "rich_text" }],
    });
  });

  it("only accepts ISO dates", () => {
    expect(buildFieldValue(dateColumn, "2026-08-10T12:00:00Z")).toEqual({
      column_id: "Col002",
      date: ["2026-08-10"],
    });
    expect(buildFieldValue(dateColumn, "10.08.2026")).toBeNull();
  });

  it("maps an app status onto a Slack select option through its synonyms", () => {
    expect(buildFieldValue(selectColumn, "done")).toEqual({
      column_id: "Col003",
      select: ["opt_done"],
    });
    expect(buildFieldValue(selectColumn, "pending")).toEqual({
      column_id: "Col003",
      select: ["opt_todo"],
    });
  });

  it("skips column types that cannot be filled from a task", () => {
    expect(buildFieldValue({ id: "Col009", name: "Osoba", type: "user" }, "Ala")).toBeNull();
  });
});

describe("readFieldValue", () => {
  it("returns the option label rather than the raw option id", () => {
    const column: SlackColumn = {
      id: "Col003",
      name: "Status",
      type: "select",
      options: { choices: [{ value: "opt_done", label: "Completed" }] },
    };
    expect(readFieldValue({ column_id: "Col003", select: ["opt_done"] }, column)).toBe("Completed");
  });

  it("reads checkbox columns as a task status", () => {
    expect(readFieldValue({ column_id: "Col004", checkbox: [true] })).toBe("done");
    expect(readFieldValue({ column_id: "Col004", checkbox: [false] })).toBe("pending");
  });
});

describe("normalizeTaskStatus", () => {
  it("maps common Slack labels onto statuses stored in the database", () => {
    expect(normalizeTaskStatus("Completed")).toBe("done");
    expect(normalizeTaskStatus("not started")).toBe("pending");
    expect(normalizeTaskStatus("In Review")).toBe("waiting_for_acceptance");
  });

  it("returns null for values it cannot map, so nothing unknown reaches the database", () => {
    expect(normalizeTaskStatus("jakiś własny status")).toBeNull();
    expect(normalizeTaskStatus(null)).toBeNull();
  });
});

describe("belongsOnList", () => {
  const defaultList = { listId: "F_DEFAULT", isDefault: true };
  const otherList = { listId: "F_OTHER", isDefault: false };

  it("wysyła zadanie z kategorii slack na listę domyślną, gdy nie wskazano innej", () => {
    expect(belongsOnList({ category: "slack" }, undefined, defaultList)).toBe(true);
    expect(belongsOnList({ category: "slack" }, undefined, otherList)).toBe(false);
  });

  it("respektuje listę wskazaną w formularzu", () => {
    expect(belongsOnList({ category: "slack" }, "F_OTHER", otherList)).toBe(true);
    expect(belongsOnList({ category: "slack" }, "F_OTHER", defaultList)).toBe(false);
  });

  it("nie wysyła zadań spoza kategorii slack, nawet z przypisaną listą", () => {
    expect(belongsOnList({ category: "zakupy" }, undefined, defaultList)).toBe(false);
    expect(belongsOnList({ category: "zakupy" }, "F_OTHER", otherList)).toBe(false);
    expect(belongsOnList({ category: null }, undefined, defaultList)).toBe(false);
  });

  it("kategoria jest warunkiem koniecznym niezależnie od pozostałych", () => {
    expect(belongsOnList({ category: "slack" }, "F_OTHER", otherList)).toBe(true);
    expect(belongsOnList({ category: "praca" }, "F_OTHER", otherList)).toBe(false);
  });
});

describe("findAssigneeColumn", () => {
  const todoList: SlackColumn[] = [
    { id: "Col001", key: "name", name: "Name", type: "text" },
    { id: "Col002", key: "todo_completed", name: "Completed", type: "todo_completed" },
    { id: "Col003", key: "todo_assignee", name: "Assignee", type: "todo_assignee" },
    { id: "Col004", key: "todo_due_date", name: "Due Date", type: "todo_due_date" },
    { id: "Col005", key: "people", name: "People", type: "user" },
    { id: "Col006", key: "opis", name: "Opis", type: "rich_text" },
  ];

  it("wybiera kolumnę Assignee, a nie People", () => {
    expect(findAssigneeColumn(todoList)?.id).toBe("Col003");
  });

  it("rozpoznaje zwykłą kolumnę user po nazwie, gdy nie ma typu todo_assignee", () => {
    const columns: SlackColumn[] = [
      { id: "Col010", key: "people", name: "People", type: "user" },
      { id: "Col011", key: "owner", name: "Osoba odpowiedzialna", type: "user" },
    ];
    expect(findAssigneeColumn(columns)?.id).toBe("Col011");
  });

  it("nie zgaduje, gdy żadna kolumna user nie wygląda na właściciela", () => {
    const columns: SlackColumn[] = [
      { id: "Col020", key: "people", name: "People", type: "user" },
      { id: "Col021", key: "watchers", name: "Obserwatorzy", type: "user" },
    ];
    expect(findAssigneeColumn(columns)).toBeNull();
  });
});

describe("buildAssigneeValue", () => {
  const column: SlackColumn = { id: "Col003", name: "Assignee", type: "todo_assignee" };

  it("wysyła zakodowane ID użytkownika Slack, nie adres e-mail", () => {
    expect(buildAssigneeValue(column, "U012A34BCDE")).toEqual({
      column_id: "Col003",
      user: ["U012A34BCDE"],
    });
  });

  it("pomija kolumnę, gdy połączenie nie ma zapisanego slack_user_id", () => {
    expect(buildAssigneeValue(column, null)).toBeNull();
  });
});

describe("isMissingItemError", () => {
  const withCode = (code: string) => Object.assign(new Error(code), { slackError: code });

  it("rozpoznaje wszystkie warianty, którymi Slack mówi \"tej pozycji już nie ma\"", () => {
    for (const code of [
      "record_deleted",
      "record_not_found",
      "row_not_found",
      "invalid_row_id",
      "item_not_found",
    ]) {
      expect(isMissingItemError(withCode(code))).toBe(true);
    }
  });

  it("nie połyka błędów, które trzeba pokazać", () => {
    expect(isMissingItemError(withCode("invalid_auth"))).toBe(false);
    expect(isMissingItemError(withCode("ratelimited"))).toBe(false);
    expect(isMissingItemError(new Error("boom"))).toBe(false);
  });
});

describe("resolveDirection", () => {
  const t = (iso: string) => new Date(iso).getTime();

  it("wysyła do Slacka, gdy zmieniło się tylko zadanie", () => {
    expect(
      resolveDirection({
        appChanged: true,
        slackChanged: false,
        taskUpdatedAt: null,
        itemUpdatedAt: null,
      })
    ).toBe("push");
  });

  it("pobiera ze Slacka, gdy zmieniła się tylko pozycja", () => {
    expect(
      resolveDirection({
        appChanged: false,
        slackChanged: true,
        taskUpdatedAt: null,
        itemUpdatedAt: null,
      })
    ).toBe("pull");
  });

  it("przy zmianie po obu stronach decyduje nowsza data", () => {
    expect(
      resolveDirection({
        appChanged: true,
        slackChanged: true,
        taskUpdatedAt: t("2026-08-04T12:00:00Z"),
        itemUpdatedAt: t("2026-08-04T10:00:00Z"),
      })
    ).toBe("push");

    expect(
      resolveDirection({
        appChanged: true,
        slackChanged: true,
        taskUpdatedAt: t("2026-08-04T10:00:00Z"),
        itemUpdatedAt: t("2026-08-04T12:00:00Z"),
      })
    ).toBe("pull");
  });

  it("bez daty po którejkolwiek stronie wygrywa Slack", () => {
    const konflikt = { appChanged: true, slackChanged: true };
    expect(
      resolveDirection({ ...konflikt, taskUpdatedAt: null, itemUpdatedAt: t("2026-08-04T10:00:00Z") })
    ).toBe("pull");
    expect(
      resolveDirection({ ...konflikt, taskUpdatedAt: t("2026-08-04T10:00:00Z"), itemUpdatedAt: null })
    ).toBe("pull");
    expect(resolveDirection({ ...konflikt, taskUpdatedAt: null, itemUpdatedAt: null })).toBe("pull");
  });

  it("przy identycznych datach też wygrywa Slack", () => {
    const same = t("2026-08-04T10:00:00Z");
    expect(
      resolveDirection({
        appChanged: true,
        slackChanged: true,
        taskUpdatedAt: same,
        itemUpdatedAt: same,
      })
    ).toBe("pull");
  });

  it("nic nie robi, gdy nic się nie zmieniło", () => {
    expect(
      resolveDirection({
        appChanged: false,
        slackChanged: false,
        taskUpdatedAt: null,
        itemUpdatedAt: null,
      })
    ).toBe("none");
  });
});

describe("znaczniki czasu", () => {
  it("czyta updated_at zadania, tolerując brak kolumny", () => {
    expect(taskUpdatedAt({ updated_at: "2026-08-04T10:00:00Z" })).toBe(
      new Date("2026-08-04T10:00:00Z").getTime()
    );
    expect(taskUpdatedAt({ updated_at: null })).toBeNull();
    expect(taskUpdatedAt({})).toBeNull();
    expect(taskUpdatedAt({ updated_at: "nie-data" })).toBeNull();
  });

  it("przelicza updated_timestamp Slacka z sekund na milisekundy", () => {
    expect(itemUpdatedAt({ updated_timestamp: "1758744346" })).toBe(1758744346000);
    expect(itemUpdatedAt({ updated_timestamp: undefined })).toBeNull();
    expect(itemUpdatedAt({ updated_timestamp: "0" })).toBeNull();
  });
});

describe("readFieldValue - kolumna zaznaczenia", () => {
  const completed: SlackColumn = {
    id: "Col002",
    key: "todo_completed",
    name: "Completed",
    type: "todo_completed",
  };

  it("czyta boolean, bo Slack NIE opakowuje checkboxa w tablicę", () => {
    expect(readFieldValue({ column_id: "Col002", value: true, checkbox: true }, completed)).toBe(
      "done"
    );
    expect(readFieldValue({ column_id: "Col002", value: false, checkbox: false }, completed)).toBe(
      "pending"
    );
  });

  it("radzi sobie też z wariantem tablicowym", () => {
    expect(readFieldValue({ column_id: "Col002", checkbox: [true] }, completed)).toBe("done");
    expect(readFieldValue({ column_id: "Col002", checkbox: [false] }, completed)).toBe("pending");
  });

  it("odczytuje stan z samego value, gdy brakuje pola checkbox", () => {
    expect(readFieldValue({ column_id: "Col002", value: true }, completed)).toBe("done");
    expect(readFieldValue({ column_id: "Col002", value: "false" }, completed)).toBe("pending");
  });

  it("zwraca null dla pustej komórki, zamiast udawać odznaczoną", () => {
    expect(readFieldValue({ column_id: "Col002" }, completed)).toBeNull();
  });

  it("wynik da się zamienić na status zapisywany w bazie", () => {
    const raw = readFieldValue({ column_id: "Col002", checkbox: true }, completed);
    expect(normalizeTaskStatus(raw)).toBe("done");
    expect(normalizeTaskStatus("true")).toBeNull();
  });
});

describe("buildFieldValue - kolumna zaznaczenia", () => {
  const completed: SlackColumn = { id: "Col002", name: "Completed", type: "todo_completed" };

  it("wysyła boolean w formacie, którego oczekuje Slack", () => {
    expect(buildFieldValue(completed, "done")).toEqual({ column_id: "Col002", checkbox: true });
    expect(buildFieldValue(completed, "pending")).toEqual({ column_id: "Col002", checkbox: false });
    expect(buildFieldValue(completed, "waiting_for_acceptance")).toEqual({
      column_id: "Col002",
      checkbox: false,
    });
  });
});