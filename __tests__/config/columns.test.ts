// __tests__/config/columns.test.ts
//
// Jawne listy kolumn zamiast select("*"): zgodność ze schematem, brak powrotu select("*") w kodzie i zgodność kopii Edge.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { TABLE_COLUMNS, cols } from "@/lib/db/columns";
import { DB_COLUMNS, DB_TABLES } from "../fixtures/dbSchema";

const ROOT = process.cwd();
const SOURCE_DIRS = ["hooks", "pages", "lib", "providers", "components", "supabase/functions"];

function sourceFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) return name === "node_modules" ? [] : sourceFiles(rel);
    return /\.(ts|tsx)$/.test(name) ? [rel] : [];
  });
}

const split = (list: string) => list.split(",").map((c) => c.trim());
const byName = (a: string, b: string) => a.localeCompare(b);

describe("lib/db/columns", () => {
  it("każda lista kolumn jest dokładnie kolumnami tabeli ze schematu (bez duplikatów)", () => {
    for (const [table, list] of Object.entries(TABLE_COLUMNS)) {
      expect(DB_TABLES).toContain(table);
      const columns = split(list);
      expect(new Set(columns).size).toBe(columns.length);
      expect([...columns].sort(byName)).toEqual([...DB_COLUMNS[table]].sort(byName));
    }
  });

  it("cols() zwraca listę kolumn", () => {
    expect(cols("notes")).toBe(TABLE_COLUMNS.notes);
    expect(cols("notes")).toContain("folder");
  });

  it('w kodzie aplikacji i funkcji Edge nie ma select("*") ani select() bez kolumn', () => {
    const offenders: string[] = [];
    for (const dir of SOURCE_DIRS) {
      for (const file of sourceFiles(dir)) {
        const text = readFileSync(join(ROOT, file), "utf8");
        if (/\.select\(\s*(?:"\*"|'\*')?\s*\)/.test(text)) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("kopia list dla funkcji Edge jest zgodna z listami aplikacji", () => {
    const text = readFileSync(join(ROOT, "supabase/functions/_shared/columns.ts"), "utf8");
    const edge = Object.fromEntries(
      [...text.matchAll(/^\s{2}([a-z_]+):\s*\n?\s*"([^"]+)",/gm)].map((m) => [m[1], m[2]])
    );
    expect(Object.keys(edge).length).toBeGreaterThan(0);
    for (const [table, list] of Object.entries(edge)) {
      expect(TABLE_COLUMNS[table as keyof typeof TABLE_COLUMNS]).toBe(list);
    }
  });
});
