// __tests__/config/accountCoverage.test.ts
//
// Eksport danych (RODO art. 15, 20) i usuwanie konta (art. 17) muszą obejmować WSZYSTKIE tabele i kubełki Storage.
// Nowa tabela w schemacie bez wpisu w rejestrze albo bez decyzji w tym pliku powoduje błąd testu.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { USER_STORAGE_BUCKETS, USER_TABLES } from "@/config/userData";
import { DB_BUCKETS, DB_TABLES } from "../fixtures/dbSchema";

/** Ankiety terminów mają osobną, zagnieżdżoną obsługę w lib/server/accountData.ts (eksport i usuwanie). */
const HANDLED_IN_ACCOUNT_DATA = [
  "meeting_polls",
  "meeting_poll_dates",
  "meeting_poll_responses",
  "meeting_poll_availabilities",
  "meeting_poll_bookings",
] as const;

/** Dane referencyjne bez właściciela – nie należą do konta. */
const REFERENCE_TABLES = ["stops"] as const;

/** Wpisy rejestru dla tabel, których nie ma już w schemacie (usuwanie pomija brakujące tabele). */
const LEGACY_TABLES = ["bills", "google_calendar_tokens", "places"] as const;

/** Kolumny z sekretami lub materiałem wewnętrznym – nigdy w pliku eksportu. */
const SECRET_COLUMNS: Record<string, readonly string[]> = {
  connected_calendars: ["access_token", "refresh_token", "sync_token"],
  mail_accounts: ["access_token", "refresh_token"],
  vault_connections: ["access_token", "refresh_token"],
  slack_connections: ["access_token"],
  shortcut_tokens: ["token_hash"],
  mail_forwarding_addresses: ["token_hash"],
  mail_inbox: ["payload_encrypted"],
  push_subscriptions: ["subscription"],
  letter_attachments: ["storage_path"],
};

const registry = new Map(USER_TABLES.map((t) => [t.table, t]));
const accountData = readFileSync(join(process.cwd(), "lib/server/accountData.ts"), "utf8");
const byName = (a: string, b: string) => a.localeCompare(b);

describe("pokrycie tabel w eksporcie i usuwaniu konta", () => {
  it("każda tabela schematu jest w rejestrze albo ma jawnie opisaną obsługę", () => {
    const covered = new Set<string>([...registry.keys(), ...HANDLED_IN_ACCOUNT_DATA, ...REFERENCE_TABLES]);
    expect(DB_TABLES.filter((t) => !covered.has(t))).toEqual([]);
  });

  it("rejestr nie zawiera nieznanych tabel poza dawnymi (nieistniejącymi w schemacie)", () => {
    const unknown = [...registry.keys()].filter(
      (t) => !(DB_TABLES as readonly string[]).includes(t) && !(LEGACY_TABLES as readonly string[]).includes(t)
    );
    expect(unknown).toEqual([]);
  });

  it("tabele z zagnieżdżoną obsługą występują zarówno w eksporcie, jak i w usuwaniu", () => {
    const exportPart = accountData.slice(
      accountData.indexOf("export async function exportUserData"),
      accountData.indexOf("async function deleteWhere")
    );
    const deletePart = accountData.slice(accountData.indexOf("export async function deleteUserData"));
    for (const table of HANDLED_IN_ACCOUNT_DATA) {
      expect(exportPart).toContain(table);
      expect(deletePart).toContain(table);
    }
  });

  it("wszystkie kubełki Storage są objęte eksportem listy plików i usuwaniem", () => {
    expect([...USER_STORAGE_BUCKETS].sort(byName)).toEqual([...DB_BUCKETS].sort(byName));
  });

  it("odpowiedzi tej osoby w cudzych ankietach są eksportowane i usuwane", () => {
    expect(accountData).toContain("meeting_poll_own_responses");
    expect(accountData).toMatch(/column: "user_id",\s*values: \[userId\]/);
  });

  it.each(Object.entries(SECRET_COLUMNS))("eksport %s nie zawiera sekretów", (table, secrets) => {
    const entry = registry.get(table);
    expect(entry).toBeDefined();
    expect(entry?.exportColumns).toBeDefined();
    const exported = (entry?.exportColumns ?? "").split(",").map((c) => c.trim());
    for (const secret of secrets) expect(exported).not.toContain(secret);
  });

  it("kolejność usuwania: etapy rosnące od 1, bez luk", () => {
    const stages = [...new Set(USER_TABLES.map((t) => t.stage))].sort((a, b) => a - b);
    expect(stages[0]).toBe(1);
    stages.forEach((stage, i) => expect(stage).toBe(i + 1));
  });
});
