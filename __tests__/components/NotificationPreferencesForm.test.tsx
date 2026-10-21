// __tests__/components/NotificationPreferencesForm.test.tsx

import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotificationPreferences from "@/components/settings/NotificationPreferencesForm";
import { DEFAULT_SETTINGS } from "@/config/defaults";

const updateSettings = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/hooks/db/useSettings", () => ({
  useSettings: () => ({ settings: DEFAULT_SETTINGS, updateSettings }),
}));

/** Rodzaj powiadomienia (handler / funkcja) → przełącznik, który go wyłącza. */
const HANDLER_PREFERENCES: Record<string, string[]> = {
  morning_brief: ["notif_morning_brief"],
  upcoming_task: ["notif_tasks"],
  upcoming_event: ["notif_events"],
  hydration: ["notif_water"],
  daily_habits: ["notif_habits"],
  day_schema: ["notif_day_schema"],
  evening_audit: ["notif_evening"],
  letters_deadline: ["notif_letters"],
  poll_closing: ["notif_polls"],
  people: ["notif_birthdays", "notif_contact"],
  task_reminder: ["notif_reminders"],
  bill_due: ["notif_bills"],
};

const read = (path: string) => readFileSync(path, "utf8");

describe("przełączniki powiadomień", () => {
  it("każdy przełącznik z ustawień zapisuje wartość false po kliknięciu", async () => {
    const user = userEvent.setup();
    render(<NotificationPreferences />);
    const switches = screen.getAllByRole("switch");
    for (const sw of switches) await user.click(sw);
    const keys = updateSettings.mock.calls.map(([patch]) => Object.keys(patch)[0]);
    expect(new Set(keys).size).toBe(switches.length);
    // notif_bills ma domyślnie false, więc jego pierwsze kliknięcie włącza.
    for (const [patch] of updateSettings.mock.calls) {
      const [key, value] = Object.entries(patch)[0];
      expect(value).toBe(key === "notif_bills");
    }
  });

  it("każdy handler process-notifications ma przełącznik w ustawieniach", () => {
    const source = read("supabase/functions/process-notifications/index.ts");
    const block = source.slice(source.indexOf("NOTIFICATION_HANDLERS"));
    const handlers = [...block.matchAll(/^\s{2}([a-z_]+): process[A-Za-z]+,$/gm)].map((m) => m[1]);
    expect(handlers.length).toBeGreaterThan(0);
    const missing = handlers.filter((h) => !HANDLER_PREFERENCES[h]);
    expect(missing, `Handler bez przełącznika: ${missing.join(", ")}`).toEqual([]);
  });

  it("wszystkie klucze notif_* używane w funkcjach istnieją w formularzu", async () => {
    const user = userEvent.setup();
    render(<NotificationPreferences />);
    updateSettings.mockClear();
    for (const sw of screen.getAllByRole("switch")) await user.click(sw);
    const formKeys = new Set(updateSettings.mock.calls.map(([patch]) => Object.keys(patch)[0]));
    const used = new Set(
      ["process-notifications", "send-love"].flatMap(
        (f) => read(`supabase/functions/${f}/index.ts`).match(/notif_[a-z_]+/g) ?? []
      )
    );
    const absent = [...used].filter((k) => !formKeys.has(k));
    expect(absent).toEqual([]);
    for (const keys of Object.values(HANDLER_PREFERENCES)) for (const k of keys) expect(formKeys.has(k)).toBe(true);
    expect(formKeys.has("notif_love")).toBe(true);
  });
});
