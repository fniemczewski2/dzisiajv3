// __tests__/config/userData.test.ts

import { describe, expect, it } from "vitest";
import { USER_TABLES } from "@/config/userData";

describe("rejestr tabel z danymi użytkownika", () => {
  it("każda tabela występuje raz", () => {
    const names = USER_TABLES.map((t) => t.table);
    expect(new Set(names).size).toBe(names.length);
  });

  it("etykiety eksportu są unikalne i po polsku (bez ASCII-zastępników)", () => {
    const labels = USER_TABLES.map((t) => t.label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const label of labels)
      expect(label).not.toMatch(/\b(Wyjatki|schematow|Sledzone|pociagi|terminow|zakupow|budzetu|Polaczone|stale)\b/);
  });

  it("tabele z tokenami eksportują tylko wskazane kolumny bez sekretów", () => {
    for (const table of [
      "connected_calendars",
      "slack_connections",
      "push_subscriptions",
      "shortcut_tokens",
      "google_calendar_tokens",
    ]) {
      const entry = USER_TABLES.find((t) => t.table === table);
      expect(entry?.exportColumns, `${table}: brak listy kolumn`).toBeTruthy();
      expect(entry?.exportColumns).not.toMatch(/token_hash|access_token|refresh_token|subscription\b/);
    }
  });

  it("tabele zależne są usuwane przed tabelami, na które wskazują", () => {
    const stage = (name: string) => USER_TABLES.find((t) => t.table === name)?.stage ?? 0;
    const dependencies: [string, string][] = [
      ["task_reminders", "tasks"],
      ["slack_task_links", "tasks"],
      ["tasks", "recurring_bills"],
      ["transactions", "recurring_bills"],
      ["transactions", "budget_categories"],
      ["transactions", "finance_profiles"],
      ["recurring_bills", "budget_categories"],
      ["events", "connected_calendars"],
      ["slack_lists", "slack_connections"],
      ["day_schema_choices", "day_schemas"],
      ["bills", "budget_categories"],
      ["letter_attachments", "letters"],
    ];
    for (const [child, parent] of dependencies)
      expect(stage(child), `${child} → ${parent}`).toBeLessThan(stage(parent));
  });

  it("załączniki pism są w rejestrze i nie eksportują ścieżek w Storage", () => {
    const entry = USER_TABLES.find((t) => t.table === "letter_attachments");
    expect(entry, "brak letter_attachments w rejestrze").toBeTruthy();
    expect(entry?.owner).toBe("user_id");
    expect(entry?.exportColumns).toBeTruthy();
    expect(entry?.exportColumns).not.toMatch(/storage_path/);
  });
});
